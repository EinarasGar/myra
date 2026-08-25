pub mod account_detail;
pub mod account_transactions;
pub mod accounts;
pub mod ai_chat;
pub mod ai_usage;
pub mod asset_detail;
pub mod asset_overview;
pub mod assets;
pub mod categories;
pub mod connector_local;
pub mod connectors;
pub mod infra;
pub mod onboarding;
pub mod portfolio;
pub mod quick_uploads;
pub mod sse;
pub mod transactions;

use std::sync::{Arc, Mutex};

use self::infra::SharedInfra;
use crate::api::quick_upload;
use crate::error::ApiError;
use crate::models::{
    AuthMe, AuthMode, ConnectionStatus, CreateAccountInput, QuickUploadDetail, ServerInfo,
    UpdateAccountInput,
};

/// Chart period ranges and their display labels.
/// Shared between account_detail and asset_detail modules.
pub(crate) const CHART_RANGES: &[&str] = &["1d", "1w", "1m", "3m", "6m", "1y", "all"];
pub(crate) const CHART_LABELS: &[&str] = &["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"];

fn compute_connection_status_from(infra: &SharedInfra) -> ConnectionStatus {
    use std::sync::atomic::Ordering;
    if !infra.connectivity.load(Ordering::Relaxed) {
        ConnectionStatus::DeviceOffline
    } else if infra.is_offline.load(Ordering::Relaxed) {
        ConnectionStatus::ServerUnreachable
    } else {
        ConnectionStatus::Online
    }
}

fn should_resume_connectivity_work(was_connected: bool, connected: bool) -> bool {
    !was_connected && connected
}

#[uniffi::export(callback_interface)]
#[async_trait::async_trait]
pub trait AuthProvider: Send + Sync {
    async fn get_token(&self) -> Option<String>;
    fn get_user_id(&self) -> Option<String>;
}

#[uniffi::export(callback_interface)]
pub trait ConnectionObserver: Send + Sync {
    fn on_connection_status_changed(&self, status: ConnectionStatus);
}

#[uniffi::export(callback_interface)]
pub trait CredentialStore: Send + Sync {
    fn load_refresh_token(&self) -> Option<String>;
    fn save_refresh_token(&self, token: String);
    fn clear_refresh_token(&self);
}

#[uniffi::export(callback_interface)]
pub trait AuthObserver: Send + Sync {
    fn on_session_expired(&self);
}

#[derive(uniffi::Object)]
pub struct AppStore {
    infra: Arc<SharedInfra>,
    auth_provider: Arc<dyn AuthProvider>,
    credential_store: Arc<dyn CredentialStore>,
    connection_observer: Arc<Mutex<Option<Box<dyn ConnectionObserver>>>>,
    auth_observer: Arc<Mutex<Option<Box<dyn AuthObserver>>>>,
    portfolio: Mutex<portfolio::PortfolioModule>,
    accounts: Mutex<accounts::AccountsModule>,
    categories: Mutex<categories::CategoriesModule>,
    account_detail: Mutex<account_detail::AccountDetailModule>,
    account_transactions: Mutex<account_transactions::AccountTransactionsModule>,
    asset_detail: Mutex<asset_detail::AssetDetailModule>,
    asset_overview: Mutex<asset_overview::AssetOverviewModule>,
    transactions: Mutex<transactions::TransactionsModule>,
    quick_uploads: Arc<Mutex<quick_uploads::QuickUploadsModule>>,
    ai_chat: Arc<Mutex<ai_chat::AiChatModule>>,
}

#[uniffi::export(async_runtime = "tokio")]
impl AppStore {
    #[uniffi::constructor]
    pub fn new(
        base_url: String,
        cache_ttl_secs: u64,
        db_path: String,
        auth_provider: Box<dyn AuthProvider>,
        credential_store: Box<dyn CredentialStore>,
    ) -> Self {
        #[cfg(target_os = "android")]
        {
            use tracing_subscriber::prelude::*;
            if let Ok(layer) = tracing_android::layer("sverto-core") {
                let _ = tracing_subscriber::registry().with(layer).try_init();
            }
        }

        tracing::info!("AppStore::new base_url={} db_path={}", base_url, db_path);

        let auth_provider: Arc<dyn AuthProvider> = Arc::from(auth_provider);
        let credential_store: Arc<dyn CredentialStore> = Arc::from(credential_store);

        let normalised = crate::store::infra::normalise_url(&base_url);

        {
            let conn = rusqlite::Connection::open(&db_path)
                .expect("failed to open db for quick_upload init");
            quick_upload::init_table(&conn, &normalised);
        }

        let infra = Arc::new(SharedInfra::new(
            normalised,
            cache_ttl_secs,
            db_path,
            Arc::clone(&auth_provider),
            Arc::clone(&credential_store),
        ));

        let connection_observer: Arc<Mutex<Option<Box<dyn ConnectionObserver>>>> =
            Arc::new(Mutex::new(None));
        let auth_observer: Arc<Mutex<Option<Box<dyn AuthObserver>>>> = Arc::new(Mutex::new(None));

        {
            let obs = Arc::clone(&connection_observer);
            let infra_ref = Arc::clone(&infra);
            infra.set_on_offline_changed(std::sync::Arc::new(move || {
                let status = compute_connection_status_from(&infra_ref);
                if let Some(observer) = obs.lock().unwrap().as_ref() {
                    observer.on_connection_status_changed(status);
                }
            }));
        }

        {
            let obs = Arc::clone(&auth_observer);
            infra.set_on_auth_expired(std::sync::Arc::new(move || {
                if let Some(observer) = obs.lock().unwrap().as_ref() {
                    observer.on_session_expired();
                }
            }));
        }

        Self {
            infra,
            auth_provider,
            credential_store,
            connection_observer,
            auth_observer,
            portfolio: Mutex::new(portfolio::PortfolioModule::new()),
            accounts: Mutex::new(accounts::AccountsModule::new()),
            categories: Mutex::new(categories::CategoriesModule::new()),
            account_detail: Mutex::new(account_detail::AccountDetailModule::new()),
            account_transactions: Mutex::new(account_transactions::AccountTransactionsModule::new()),
            asset_detail: Mutex::new(asset_detail::AssetDetailModule::new()),
            asset_overview: Mutex::new(asset_overview::AssetOverviewModule::new()),
            transactions: Mutex::new(transactions::TransactionsModule::new()),
            quick_uploads: Arc::new(Mutex::new(quick_uploads::QuickUploadsModule::new())),
            ai_chat: Arc::new(Mutex::new(ai_chat::AiChatModule::new())),
        }
    }

    pub fn set_connectivity(&self, connected: bool) {
        let was_connected = self
            .infra
            .connectivity
            .swap(connected, std::sync::atomic::Ordering::Relaxed);
        if connected {
            self.infra.set_is_offline(false);
        }
        self.notify_connection_status();
        if should_resume_connectivity_work(was_connected, connected) {
            if let Ok(handle) = tokio::runtime::Handle::try_current() {
                let infra = Arc::clone(&self.infra);
                let module = Arc::clone(&self.quick_uploads);
                handle.spawn(async move {
                    let token = infra.get_auth_token().await;
                    quick_uploads::flush_and_subscribe(&infra, &module, token.as_deref()).await;
                });
            }
        }
    }

    pub fn observe_connection(&self, observer: Box<dyn ConnectionObserver>) {
        let status = self.compute_connection_status();
        observer.on_connection_status_changed(status);
        *self.connection_observer.lock().unwrap() = Some(observer);
    }

    pub fn unobserve_connection(&self) {
        *self.connection_observer.lock().unwrap() = None;
    }
    pub fn get_onboarding_version(&self) -> i32 {
        self.infra.onboarding_version().unwrap_or(0)
    }
    pub fn get_default_asset_id(&self) -> Option<i32> {
        self.infra.default_asset_id()
    }

    pub fn get_default_asset_ticker(&self) -> Option<String> {
        self.infra.default_asset_ticker()
    }

    pub async fn on_sign_in(&self) {
        let token = self.get_auth_token().await;
        let auth_me = self
            .infra
            .get("/api/auth/me", token.as_deref())
            .await
            .ok()
            .and_then(|response| serde_json::from_str::<AuthMe>(&response.body).ok());

        if let Some(auth_me) = auth_me {
            self.infra.apply_auth_me(&auth_me);
        } else {
            *self.infra.user_id.lock().unwrap() = self.auth_provider.get_user_id();
        }

        tracing::info!(
            "AppStore::on_sign_in user_id={:?} default_asset_id={:?} default_asset_ticker={:?} onboarding_version={:?}",
            self.infra.user_id(),
            self.infra.default_asset_id(),
            self.infra.default_asset_ticker(),
            self.infra.onboarding_version()
        );
    }

    pub fn on_sign_out(&self) {
        tracing::info!("AppStore::on_sign_out");
        *self.infra.user_id.lock().unwrap() = None;
        self.infra.clear_memory_cache();
        self.portfolio.lock().unwrap().clear_state();
        self.accounts.lock().unwrap().clear_state();
        self.categories.lock().unwrap().clear_state();
        self.asset_overview.lock().unwrap().clear_state();
        self.account_detail.lock().unwrap().clear_state();
        self.account_transactions.lock().unwrap().clear_state();
        self.asset_detail.lock().unwrap().clear_state();
        self.transactions.lock().unwrap().clear_state();
        self.quick_uploads.lock().unwrap().clear_state();
        self.ai_chat.lock().unwrap().clear_state();
    }

    // ── Portfolio ────────────────────────────────────────────────────────

    pub fn observe_portfolio(&self, observer: Box<dyn portfolio::PortfolioObserver>) {
        self.portfolio.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_portfolio(&self) {
        self.portfolio.lock().unwrap().clear_observer();
    }

    pub async fn load_portfolio(&self) {
        let token = self.get_auth_token().await;
        portfolio::load_portfolio(&self.infra, &self.portfolio, token.as_deref()).await;
    }

    pub async fn refresh_portfolio(&self) {
        let token = self.get_auth_token().await;
        portfolio::refresh_portfolio(&self.infra, &self.portfolio, token.as_deref()).await;
    }

    // ── Accounts ─────────────────────────────────────────────────────────

    pub fn observe_accounts(&self, observer: Box<dyn accounts::AccountsObserver>) {
        self.accounts.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_accounts(&self) {
        self.accounts.lock().unwrap().clear_observer();
    }

    pub async fn load_accounts(&self) {
        let token = self.get_auth_token().await;
        accounts::load_accounts(&self.infra, &self.accounts, token.as_deref()).await;
    }

    pub async fn refresh_accounts(&self) {
        let token = self.get_auth_token().await;
        accounts::refresh_accounts(&self.infra, &self.accounts, token.as_deref()).await;
    }

    // ── Categories ───────────────────────────────────────────────────

    pub fn observe_categories(&self, observer: Box<dyn categories::CategoriesObserver>) {
        self.categories.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_categories(&self) {
        self.categories.lock().unwrap().clear_observer();
    }

    pub async fn load_categories(&self) {
        let token = self.get_auth_token().await;
        categories::load_categories(&self.infra, &self.categories, token.as_deref()).await;
    }

    pub async fn refresh_categories(&self) {
        let token = self.get_auth_token().await;
        categories::refresh_categories(&self.infra, &self.categories, token.as_deref()).await;
    }

    pub async fn create_category(
        &self,
        name: String,
        icon: String,
        type_id: i32,
    ) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        categories::create_category(
            &self.infra,
            &self.categories,
            name,
            icon,
            type_id,
            token.as_deref(),
        )
        .await
    }

    pub async fn update_category(
        &self,
        id: i32,
        name: String,
        icon: String,
        type_id: i32,
    ) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        categories::update_category(
            &self.infra,
            &self.categories,
            id,
            name,
            icon,
            type_id,
            token.as_deref(),
        )
        .await
    }

    pub async fn delete_category(&self, id: i32) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        categories::delete_category(&self.infra, &self.categories, id, token.as_deref()).await
    }

    pub async fn create_category_type(&self, name: String) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        categories::create_category_type(&self.infra, &self.categories, name, token.as_deref())
            .await
    }

    pub async fn update_category_type(&self, id: i32, name: String) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        categories::update_category_type(&self.infra, &self.categories, id, name, token.as_deref())
            .await
    }

    pub async fn delete_category_type(&self, id: i32) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        categories::delete_category_type(&self.infra, &self.categories, id, token.as_deref()).await
    }

    pub async fn update_base_asset(&self, asset_id: i32, ticker: String) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        assets::update_base_asset(&self.infra, asset_id, ticker, token.as_deref()).await?;
        self.refresh_portfolio().await;
        self.refresh_accounts().await;
        Ok(())
    }

    pub async fn set_onboarding_version(&self, version: i32) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        onboarding::set_onboarding_version(&self.infra, version, token.as_deref()).await
    }

    pub async fn delete_user(&self) -> Result<(), ApiError> {
        let token = self.get_auth_token().await;
        assets::delete_user(&self.infra, token.as_deref()).await
    }

    pub async fn create_account(
        &self,
        input: CreateAccountInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        accounts::create_account(&self.infra, &self.accounts, input, token.as_deref()).await
    }

    pub async fn get_account_types(
        &self,
    ) -> Result<Vec<crate::models::AccountTypeItem>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        accounts::get_account_types(&self.infra, token.as_deref()).await
    }

    pub async fn update_account(
        &self,
        account_id: String,
        input: UpdateAccountInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        accounts::update_account(
            &self.infra,
            &self.accounts,
            &account_id,
            input,
            token.as_deref(),
        )
        .await
    }

    pub async fn delete_account(&self, account_id: String) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        accounts::delete_account(&self.infra, &self.accounts, &account_id, token.as_deref()).await
    }

    pub async fn get_account(
        &self,
        account_id: String,
    ) -> Result<crate::models::AccountEditModel, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        accounts::get_account(&self.infra, &account_id, token.as_deref()).await
    }

    // ── Account Detail ───────────────────────────────────────────────

    pub fn observe_account_detail(&self, observer: Box<dyn account_detail::AccountDetailObserver>) {
        self.account_detail.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_account_detail(&self) {
        self.account_detail.lock().unwrap().clear_observer();
    }

    pub async fn load_account_detail(
        &self,
        account_id: String,
        account_name: String,
        account_type_id: i32,
    ) {
        let token = self.get_auth_token().await;
        account_detail::load_account_detail(
            &self.infra,
            &self.account_detail,
            &account_id,
            &account_name,
            account_type_id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn refresh_account_detail(&self) {
        let token = self.get_auth_token().await;
        account_detail::refresh_account_detail(&self.infra, &self.account_detail, token.as_deref())
            .await;
    }

    // ── Account Transactions ─────────────────────────────────────────

    pub fn observe_account_transactions(
        &self,
        observer: Box<dyn account_transactions::AccountTransactionsObserver>,
    ) {
        self.account_transactions
            .lock()
            .unwrap()
            .set_observer(observer);
    }

    pub fn unobserve_account_transactions(&self) {
        self.account_transactions.lock().unwrap().clear_observer();
    }

    pub async fn load_account_transactions(&self, account_id: String) {
        let token = self.get_auth_token().await;
        account_transactions::load_account_transactions(
            &self.infra,
            &self.account_transactions,
            &account_id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn load_more_account_transactions(&self) {
        let token = self.get_auth_token().await;
        account_transactions::load_more_account_transactions(
            &self.infra,
            &self.account_transactions,
            token.as_deref(),
        )
        .await;
    }

    pub async fn refresh_account_transactions(&self) {
        let token = self.get_auth_token().await;
        account_transactions::refresh_account_transactions(
            &self.infra,
            &self.account_transactions,
            token.as_deref(),
        )
        .await;
    }

    // ── Asset Detail ─────────────────────────────────────────────────

    pub fn observe_asset_detail(&self, observer: Box<dyn asset_detail::AssetDetailObserver>) {
        self.asset_detail.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_asset_detail(&self) {
        self.asset_detail.lock().unwrap().clear_observer();
    }

    pub async fn load_asset_detail(&self, account_id: String, asset_id: i32) {
        let token = self.get_auth_token().await;
        asset_detail::load_asset_detail(
            &self.infra,
            &self.asset_detail,
            &account_id,
            asset_id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn refresh_asset_detail(&self) {
        let token = self.get_auth_token().await;
        asset_detail::refresh_asset_detail(&self.infra, &self.asset_detail, token.as_deref()).await;
    }

    pub async fn load_asset_detail_base_chart(&self) {
        let token = self.get_auth_token().await;
        asset_detail::load_asset_detail_base_chart(
            &self.infra,
            &self.asset_detail,
            token.as_deref(),
        )
        .await;
    }
    // ── Asset Overview ────────────────────────────────────────────────

    pub fn observe_asset_overview(&self, observer: Box<dyn asset_overview::AssetOverviewObserver>) {
        self.asset_overview.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_asset_overview(&self) {
        self.asset_overview.lock().unwrap().clear_observer();
    }

    pub async fn load_asset_overview(&self, asset_id: i32, reference_asset_id: i32) {
        let token = self.get_auth_token().await;
        asset_overview::load_asset_overview(
            &self.infra,
            &self.asset_overview,
            asset_id,
            reference_asset_id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn refresh_asset_overview(&self) {
        let token = self.get_auth_token().await;
        asset_overview::refresh_asset_overview(&self.infra, &self.asset_overview, token.as_deref())
            .await;
    }

    // ── Transactions (observer-based) ────────────────────────────────────

    pub fn observe_transactions(&self, observer: Box<dyn transactions::TransactionsObserver>) {
        self.transactions.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_transactions(&self) {
        self.transactions.lock().unwrap().clear_observer();
    }

    pub async fn load_transactions(&self) {
        let token = self.get_auth_token().await;
        transactions::load_transactions(&self.infra, &self.transactions, token.as_deref()).await;
    }

    pub async fn load_more_transactions(&self) {
        let token = self.get_auth_token().await;
        transactions::load_more_transactions(&self.infra, &self.transactions, token.as_deref())
            .await;
    }

    pub async fn refresh_transactions(&self) {
        let token = self.get_auth_token().await;
        transactions::refresh_transactions(&self.infra, &self.transactions, token.as_deref()).await;
    }

    pub async fn delete_transaction(&self, tx_id: String) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::delete_transaction(&self.infra, &self.transactions, &tx_id, token.as_deref())
            .await
    }

    pub async fn delete_transaction_group(
        &self,
        group_id: String,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::delete_transaction_group(
            &self.infra,
            &self.transactions,
            &group_id,
            token.as_deref(),
        )
        .await
    }

    pub async fn delete_transactions(
        &self,
        transaction_ids: Vec<String>,
        group_ids: Vec<String>,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::delete_transactions(
            &self.infra,
            &self.transactions,
            transaction_ids,
            group_ids,
            token.as_deref(),
        )
        .await
    }

    // ── Transactions (direct return) ─────────────────────────────────────

    pub async fn get_editable_transaction(
        &self,
        tx_id: String,
    ) -> Result<crate::models::EditableTransaction, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::get_editable_transaction(&self.infra, &tx_id, token.as_deref()).await
    }

    pub async fn create_individual_transaction(
        &self,
        input: crate::models::CreateTransactionInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::create_individual_transaction(
            &self.infra,
            &self.transactions,
            input,
            token.as_deref(),
        )
        .await
    }

    pub async fn update_individual_transaction(
        &self,
        tx_id: String,
        input: crate::models::CreateTransactionInput,
    ) -> Result<crate::models::TransactionListItem, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::update_individual_transaction(
            &self.infra,
            &self.transactions,
            &tx_id,
            input,
            token.as_deref(),
        )
        .await
    }

    pub async fn create_transaction_group(
        &self,
        input: crate::models::CreateTransactionGroupInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::create_transaction_group(
            &self.infra,
            &self.transactions,
            input,
            token.as_deref(),
        )
        .await
    }

    pub async fn group_individual_transactions(
        &self,
        input: crate::models::CreateTransactionGroupInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::group_individual_transactions(
            &self.infra,
            &self.transactions,
            input,
            token.as_deref(),
        )
        .await
    }

    pub async fn update_transaction_group(
        &self,
        group_id: String,
        input: crate::models::CreateTransactionGroupInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::update_transaction_group(
            &self.infra,
            &self.transactions,
            &group_id,
            input,
            token.as_deref(),
        )
        .await
    }

    // ── Search (direct return) ───────────────────────────────────────────

    pub async fn search_transactions(
        &self,
        query: String,
        cursor: Option<String>,
    ) -> Result<crate::models::TransactionsPage, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::search_transactions(&self.infra, &query, cursor.as_deref(), token.as_deref())
            .await
    }

    // ── Assets (direct return) ───────────────────────────────────────────
    pub async fn search_global_assets(
        &self,
        query: String,
        start: i32,
        count: i32,
    ) -> Result<crate::models::AssetSearchPage, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::search_global_assets(&self.infra, &query, start, count, token.as_deref()).await
    }
    pub async fn get_asset_detail(
        &self,
        asset_id: i32,
        user_asset: bool,
    ) -> Result<crate::models::AssetDetail, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::get_asset_detail(&self.infra, asset_id, user_asset, token.as_deref()).await
    }
    pub async fn get_asset_pair(
        &self,
        asset_id: i32,
        reference_id: i32,
        user_asset: bool,
    ) -> Result<crate::models::AssetPairDetail, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::get_asset_pair(
            &self.infra,
            asset_id,
            reference_id,
            user_asset,
            token.as_deref(),
        )
        .await
    }
    pub async fn get_asset_pair_rates(
        &self,
        asset_id: i32,
        reference_id: i32,
        range: String,
        user_asset: bool,
    ) -> Result<Vec<crate::models::ChartPoint>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::get_asset_pair_rates(
            &self.infra,
            asset_id,
            reference_id,
            &range,
            user_asset,
            token.as_deref(),
        )
        .await
    }

    pub async fn get_asset_pair_converted(
        &self,
        asset_id: i32,
        reference_id: i32,
        user_asset: bool,
    ) -> Result<crate::models::ConvertedPairRate, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::get_asset_pair_converted(
            &self.infra,
            asset_id,
            reference_id,
            user_asset,
            token.as_deref(),
        )
        .await
    }

    pub async fn get_asset_pair_converted_rates(
        &self,
        asset_id: i32,
        reference_id: i32,
        range: String,
        user_asset: bool,
    ) -> Result<Vec<crate::models::ChartPoint>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::get_asset_pair_converted_rates(
            &self.infra,
            asset_id,
            reference_id,
            &range,
            user_asset,
            token.as_deref(),
        )
        .await
    }
    pub async fn get_asset_types(
        &self,
    ) -> Result<Vec<crate::models::AssetTypeOption>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::get_asset_types(&self.infra, token.as_deref()).await
    }
    pub async fn get_user_assets(
        &self,
    ) -> Result<Vec<crate::models::AssetSummary>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::get_user_assets(&self.infra, token.as_deref()).await
    }
    pub async fn create_user_asset(
        &self,
        name: String,
        ticker: String,
        asset_type: i32,
        base_asset_id: i32,
    ) -> Result<i32, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::create_user_asset(
            &self.infra,
            name,
            ticker,
            asset_type,
            base_asset_id,
            token.as_deref(),
        )
        .await
    }
    pub async fn add_user_asset_pair(
        &self,
        asset_id: i32,
        reference_id: i32,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::add_user_asset_pair(&self.infra, asset_id, reference_id, token.as_deref()).await
    }
    pub async fn add_user_asset_rate(
        &self,
        asset_id: i32,
        reference_id: i32,
        date: i64,
        rate: f64,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::add_user_asset_rate(
            &self.infra,
            asset_id,
            reference_id,
            date,
            rate,
            token.as_deref(),
        )
        .await
    }
    pub async fn delete_user_asset(&self, asset_id: i32) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        assets::delete_user_asset(&self.infra, asset_id, token.as_deref()).await
    }
    pub async fn search_assets(
        &self,
        query: String,
    ) -> Result<Vec<crate::models::AssetItem>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::search_assets(&self.infra, &query, token.as_deref()).await
    }

    pub async fn get_all_currencies(&self) -> Result<Vec<crate::models::AssetItem>, ApiError> {
        let token = self.get_auth_token().await;
        transactions::get_all_currencies(&self.infra, token.as_deref()).await
    }

    pub async fn get_all_categories(
        &self,
    ) -> Result<Vec<crate::models::CategoryItem>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::get_all_categories(&self.infra, token.as_deref()).await
    }

    pub async fn get_accounts_list(
        &self,
    ) -> Result<Vec<crate::models::AccountItem>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::get_accounts_list(&self.infra, token.as_deref()).await
    }

    // ── Quick Uploads ────────────────────────────────────────────────────

    pub fn observe_quick_uploads(&self, observer: Box<dyn quick_uploads::QuickUploadsObserver>) {
        self.quick_uploads.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_quick_uploads(&self) {
        self.quick_uploads.lock().unwrap().clear_observer();
    }

    pub fn queue_quick_upload(&self, image_data: Vec<u8>, thumbnail: Vec<u8>, mime_type: String) {
        quick_uploads::queue_quick_upload(
            &self.infra,
            &self.quick_uploads,
            image_data,
            thumbnail,
            mime_type,
        );
    }

    pub async fn dismiss_quick_upload(&self, id: String) {
        let token = self.get_auth_token().await;
        quick_uploads::dismiss_quick_upload(
            &self.infra,
            &self.quick_uploads,
            &id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn complete_quick_upload(&self, upload_id: String, accepted: bool) {
        let token = self.get_auth_token().await;
        quick_uploads::complete_quick_upload(
            &self.infra,
            &self.quick_uploads,
            &upload_id,
            accepted,
            token.as_deref(),
        )
        .await;
    }

    pub async fn get_quick_upload_detail(
        &self,
        upload_id: String,
    ) -> Result<QuickUploadDetail, ApiError> {
        let token = self.get_auth_token().await;
        quick_uploads::get_quick_upload_detail(&self.infra, &upload_id, token.as_deref()).await
    }

    pub async fn send_quick_upload_correction(
        &self,
        upload_id: String,
        message: String,
    ) -> Result<QuickUploadDetail, ApiError> {
        let token = self.get_auth_token().await;
        quick_uploads::send_quick_upload_correction(
            &self.infra,
            &self.quick_uploads,
            &upload_id,
            &message,
            token.as_deref(),
        )
        .await
    }

    pub async fn refresh_quick_uploads(&self) {
        let token = self.get_auth_token().await;
        quick_uploads::flush_and_subscribe(&self.infra, &self.quick_uploads, token.as_deref())
            .await;
    }

    pub fn get_cached_me(&self) -> Option<AuthMe> {
        let url = format!("{}/api/auth/me", self.infra.base_url());
        let body = self.infra.persistent_cache.get(&url)?;
        serde_json::from_str(&body).ok()
    }

    pub fn restore_cached_me(&self) -> Option<AuthMe> {
        let auth_me = self.get_cached_me()?;
        self.infra.apply_auth_me(&auth_me);
        Some(auth_me)
    }

    // ── AI Usage ──────────────────────────────────────────────────────────

    pub async fn get_ai_usage(&self) -> Result<crate::models::AiUsage, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        ai_usage::load_ai_usage(&self.infra, token.as_deref()).await
    }

    // ── AI Chat ───────────────────────────────────────────────────────────

    pub fn observe_ai_chat(&self, observer: Box<dyn ai_chat::AiChatObserver>) {
        self.ai_chat.lock().unwrap().set_observer(observer);
    }

    pub fn unobserve_ai_chat(&self) {
        self.ai_chat.lock().unwrap().clear_observer();
    }

    pub async fn load_conversations(&self) {
        let token = self.get_auth_token().await;
        ai_chat::load_conversations(&self.infra, &self.ai_chat, token.as_deref()).await;
    }

    pub async fn create_conversation(&self) -> Result<String, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        ai_chat::create_conversation(&self.infra, &self.ai_chat, token.as_deref()).await
    }

    pub async fn delete_conversation(&self, id: String) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        ai_chat::delete_conversation(&self.infra, &self.ai_chat, &id, token.as_deref()).await
    }

    pub async fn load_messages(&self, conversation_id: String) {
        let token = self.get_auth_token().await;
        ai_chat::load_messages(
            &self.infra,
            &self.ai_chat,
            &conversation_id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn upload_chat_file(
        &self,
        image_data: Vec<u8>,
        mime_type: String,
        file_name: String,
    ) -> Result<String, crate::error::ApiError> {
        let user_id = self.infra.user_id().ok_or_else(|| ApiError::Parse {
            reason: "no user_id".into(),
        })?;
        let token = self.get_auth_token().await;
        ai_chat::upload_file(
            &self.infra,
            &user_id,
            &image_data,
            &mime_type,
            &file_name,
            token.as_deref(),
        )
        .await
    }

    pub async fn send_message(&self, conversation_id: String, text: String, file_ids: Vec<String>) {
        let token = self.get_auth_token().await;
        ai_chat::send_message(
            &self.infra,
            &self.ai_chat,
            &conversation_id,
            &text,
            &file_ids,
            token.as_deref(),
        )
        .await;
    }

    pub async fn approve_tool(&self, conversation_id: String, call_id: String, approved: bool) {
        let token = self.get_auth_token().await;
        ai_chat::approve_tool(
            &self.infra,
            &self.ai_chat,
            &conversation_id,
            &call_id,
            approved,
            token.as_deref(),
        )
        .await;
    }

    pub fn cancel_stream(&self) {
        ai_chat::cancel_stream(&self.ai_chat);
    }

    pub async fn list_connector_connections(
        &self,
    ) -> Result<Vec<crate::models::ConnectorConnection>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::list_connections(&self.infra, token.as_deref()).await
    }

    pub async fn list_connector_aspsps(
        &self,
        provider_kind: String,
        country: String,
    ) -> Result<Vec<crate::models::Aspsp>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::list_aspsps(&self.infra, &provider_kind, &country, token.as_deref()).await
    }

    pub async fn create_connector_connection(
        &self,
        input: crate::models::CreateConnectionInput,
    ) -> Result<String, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::create_connection(&self.infra, input, token.as_deref()).await
    }

    pub async fn revoke_connector_connection(
        &self,
        connection_id: String,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::revoke_connection(&self.infra, &connection_id, token.as_deref()).await
    }

    pub async fn create_connector_oauth_session(
        &self,
        connection_id: String,
        bank_name: Option<String>,
        bank_country: Option<String>,
    ) -> Result<crate::models::OAuthSessionStart, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::create_oauth_session(
            &self.infra,
            &connection_id,
            bank_name,
            bank_country,
            token.as_deref(),
        )
        .await
    }

    pub async fn complete_connector_oauth_session(
        &self,
        state: String,
        code: Option<String>,
        error: Option<String>,
    ) -> Result<crate::models::CompleteOAuthResult, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::complete_oauth_session(&self.infra, &state, code, error, token.as_deref()).await
    }

    pub fn get_pending_connector_oauth(&self) -> Option<crate::models::PendingOAuth> {
        connector_local::get_pending_oauth(&self.infra)
    }

    pub async fn list_connector_provider_accounts(
        &self,
        connection_id: String,
    ) -> Result<Vec<crate::models::ProviderAccount>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::list_provider_accounts(&self.infra, &connection_id, token.as_deref()).await
    }

    pub async fn list_connector_provider_account_transactions(
        &self,
        connection_id: String,
        provider_account_id: String,
    ) -> Result<Vec<crate::models::ProviderAccountTransaction>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::list_provider_account_transactions(
            &self.infra,
            &connection_id,
            &provider_account_id,
            token.as_deref(),
        )
        .await
    }

    pub async fn list_connector_bindings(
        &self,
    ) -> Result<Vec<crate::models::ConnectorBinding>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::list_bindings(&self.infra, token.as_deref()).await
    }

    pub async fn create_connector_binding(
        &self,
        connection_id: String,
        sverto_account_id: String,
        provider_account_id: Option<String>,
    ) -> Result<String, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::create_binding(
            &self.infra,
            &connection_id,
            &sverto_account_id,
            provider_account_id,
            token.as_deref(),
        )
        .await
    }

    pub async fn update_connector_binding(
        &self,
        binding_id: String,
        write_mode: crate::models::BindingWriteMode,
        status: crate::models::BindingStatus,
    ) -> Result<crate::models::ConnectorBinding, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::update_binding(
            &self.infra,
            &binding_id,
            write_mode,
            status,
            token.as_deref(),
        )
        .await
    }

    pub async fn delete_connector_binding(
        &self,
        binding_id: String,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::delete_binding(&self.infra, &binding_id, token.as_deref()).await
    }

    pub async fn sync_connector_binding(
        &self,
        binding_id: String,
        connection_id: String,
        credential_mode: crate::models::CredentialMode,
    ) -> Result<crate::models::SyncOutcome, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        connectors::sync_binding(
            &self.infra,
            &binding_id,
            &connection_id,
            credential_mode,
            token.as_deref(),
        )
        .await
    }

    pub fn save_connector_credential(&self, connection_id: String, secret: String) {
        connector_local::save_credential(&self.infra, &connection_id, &secret);
    }

    pub fn has_connector_credential(&self, connection_id: String) -> bool {
        connector_local::has_credential(&self.infra, &connection_id)
    }

    pub async fn list_sverto_accounts(
        &self,
    ) -> Result<Vec<crate::models::AccountListItem>, crate::error::ApiError> {
        let token = self.get_auth_token().await;
        let uid = self
            .infra
            .user_id()
            .ok_or_else(|| crate::error::ApiError::Parse {
                reason: "no user_id".into(),
            })?;
        let resp = self
            .infra
            .get(&format!("/api/users/{uid}/accounts"), token.as_deref())
            .await?;
        if resp.status >= 400 {
            return Err(crate::error::server_error(resp.status, &resp.body));
        }
        crate::api::accounts::extract_accounts(&resp.body)
            .map_err(|e| crate::error::ApiError::Parse { reason: e })
    }

    pub async fn set_transaction_visibility(
        &self,
        transaction_id: String,
        visibility: crate::models::TransactionVisibility,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::set_transaction_visibility(
            &self.infra,
            &transaction_id,
            visibility,
            token.as_deref(),
        )
        .await
    }

    pub async fn set_transactions_visibility(
        &self,
        transaction_ids: Vec<String>,
        visibility: crate::models::TransactionVisibility,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token().await;
        transactions::set_transactions_visibility(
            &self.infra,
            &transaction_ids,
            visibility,
            token.as_deref(),
        )
        .await
    }

    // ── Server selection & auth ───────────────────────────────────────────

    pub async fn connect_server(&self, url: String) -> Result<ServerInfo, ApiError> {
        let normalised = crate::store::infra::normalise_url(&url);
        let server_info = self.probe_server(normalised.clone()).await?;
        self.resume_server(normalised, server_info.auth_mode.clone())
            .await;
        Ok(server_info)
    }

    pub async fn probe_server(&self, url: String) -> Result<ServerInfo, ApiError> {
        let normalised = crate::store::infra::normalise_url(&url);
        let config_url = format!("{}/api/config", normalised);
        let resp =
            self.infra
                .http
                .get(&config_url)
                .send()
                .await
                .map_err(|e| ApiError::Network {
                    reason: e.to_string(),
                })?;

        let status = resp.status().as_u16();
        let text = resp.text().await.map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

        if status >= 400 {
            return Err(ApiError::Server {
                reason: format!("HTTP {status}"),
                status,
            });
        }

        let v: serde_json::Value = serde_json::from_str(&text).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

        let mode_str = v["auth_provider"].as_str().ok_or_else(|| ApiError::Parse {
            reason: "missing auth_provider".into(),
        })?;

        let auth_mode = match mode_str {
            "clerk" => AuthMode::Clerk,
            "database" => AuthMode::Database,
            "noauth" => AuthMode::Noauth,
            other => {
                return Err(ApiError::Parse {
                    reason: format!("unknown auth_provider: {other}"),
                })
            }
        };

        let version = v["version"].as_str().unwrap_or("").to_string();

        Ok(ServerInfo { auth_mode, version })
    }

    pub async fn resume_server(&self, url: String, auth_mode: AuthMode) {
        let normalised = crate::store::infra::normalise_url(&url);
        self.infra.set_base_url(normalised.clone());
        self.infra.set_auth_mode(auth_mode.clone());
        self.on_sign_out();

        {
            let conn = rusqlite::Connection::open(&self.infra.db_path)
                .expect("failed to open db for reset_uploading");
            quick_upload::reset_uploading(&conn, &normalised);
        }

        self.restore_session();
    }

    pub fn has_session(&self) -> bool {
        match self.infra.auth_mode.lock().unwrap().clone() {
            AuthMode::Database => self.infra.database_session_is_some(),
            AuthMode::Clerk | AuthMode::Noauth => true,
        }
    }

    pub async fn sign_in_with_password(
        &self,
        username: String,
        password: String,
    ) -> Result<(), ApiError> {
        let body = serde_json::json!({ "username": username, "password": password });
        let url = format!("{}/api/auth", self.infra.base_url());
        let resp = self
            .infra
            .http
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-Sverto-Client", "native")
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| ApiError::Network {
                reason: e.to_string(),
            })?;

        let status = resp.status().as_u16();
        let text = resp.text().await.map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

        if status >= 400 {
            return Err(crate::error::server_error(status, &text));
        }

        let v: serde_json::Value = serde_json::from_str(&text).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

        let token = v["token"]
            .as_str()
            .ok_or_else(|| ApiError::Parse {
                reason: "missing token".into(),
            })?
            .to_string();

        let refresh_token = v["refresh_token"].as_str().map(|s| s.to_string());

        if let Some(rt) = refresh_token {
            self.infra
                .set_database_session(rt.clone(), Some(token.clone()));
            self.credential_store.save_refresh_token(rt);
        }

        self.on_sign_in().await;
        Ok(())
    }

    pub async fn sign_up_with_password(
        &self,
        username: String,
        password: String,
    ) -> Result<(), ApiError> {
        let body = serde_json::json!({ "username": username, "password": password });
        let url = format!("{}/api/users", self.infra.base_url());
        let resp = self
            .infra
            .http
            .post(&url)
            .header("Content-Type", "application/json")
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| ApiError::Network {
                reason: e.to_string(),
            })?;

        let status = resp.status().as_u16();
        let text = resp.text().await.map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

        if status >= 400 {
            return Err(crate::error::server_error(status, &text));
        }

        self.sign_in_with_password(username, password).await
    }

    pub async fn sign_out(&self) {
        let mode = self.infra.auth_mode.lock().unwrap().clone();
        match mode {
            AuthMode::Database => {
                let refresh_token = self.infra.database_session_refresh_token();
                if let Some(rt) = refresh_token {
                    let url = format!("{}/api/auth/logout", self.infra.base_url());
                    let body = serde_json::json!({ "refresh_token": rt });
                    let _ = self
                        .infra
                        .http
                        .post(&url)
                        .header("Content-Type", "application/json")
                        .header("X-Sverto-Client", "native")
                        .body(body.to_string())
                        .send()
                        .await;
                }
                self.infra.clear_database_session();
                self.credential_store.clear_refresh_token();
            }
            AuthMode::Clerk | AuthMode::Noauth => {}
        }
        self.on_sign_out();
    }

    pub fn observe_auth(&self, observer: Box<dyn AuthObserver>) {
        *self.auth_observer.lock().unwrap() = Some(observer);
    }

    pub fn unobserve_auth(&self) {
        *self.auth_observer.lock().unwrap() = None;
    }

    fn restore_session(&self) {
        match self.infra.auth_mode.lock().unwrap().clone() {
            AuthMode::Database => {
                if let Some(rt) = self.credential_store.load_refresh_token() {
                    self.infra.set_database_session(rt, None);
                }
            }
            AuthMode::Clerk | AuthMode::Noauth => {}
        }
    }
}

impl AppStore {
    pub(crate) async fn get_auth_token(&self) -> Option<String> {
        self.infra.get_auth_token().await
    }

    pub(crate) fn notify_connection_status(&self) {
        let status = self.compute_connection_status();
        if let Some(observer) = self.connection_observer.lock().unwrap().as_ref() {
            observer.on_connection_status_changed(status);
        }
    }

    fn compute_connection_status(&self) -> ConnectionStatus {
        compute_connection_status_from(&self.infra)
    }
}

#[cfg(test)]
mod tests {
    use super::should_resume_connectivity_work;

    #[test]
    fn connectivity_work_only_resumes_after_reconnection() {
        assert!(!should_resume_connectivity_work(true, true));
        assert!(!should_resume_connectivity_work(true, false));
        assert!(!should_resume_connectivity_work(false, false));
        assert!(should_resume_connectivity_work(false, true));
    }
}
