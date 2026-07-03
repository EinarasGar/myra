pub mod account_detail;
pub mod account_transactions;
pub mod accounts;
pub mod ai_chat;
pub mod ai_usage;
pub mod asset_detail;
pub mod asset_overview;
pub mod assets;
pub mod categories;
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
    AuthMe, ConnectionStatus, CreateAccountInput, QuickUploadDetail, UpdateAccountInput,
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

#[uniffi::export(callback_interface)]
pub trait AuthProvider: Send + Sync {
    fn get_token(&self) -> Option<String>;
    fn get_user_id(&self) -> Option<String>;
}

#[uniffi::export(callback_interface)]
pub trait ConnectionObserver: Send + Sync {
    fn on_connection_status_changed(&self, status: ConnectionStatus);
}

#[derive(uniffi::Object)]
pub struct AppStore {
    infra: Arc<SharedInfra>,
    auth_provider: Box<dyn AuthProvider>,
    connection_observer: Arc<Mutex<Option<Box<dyn ConnectionObserver>>>>,
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
    ) -> Self {
        #[cfg(target_os = "android")]
        {
            use tracing_subscriber::prelude::*;
            if let Ok(layer) = tracing_android::layer("sverto-core") {
                let _ = tracing_subscriber::registry().with(layer).try_init();
            }
        }

        tracing::info!("AppStore::new base_url={} db_path={}", base_url, db_path);

        // Initialize quick upload tables
        {
            let conn = rusqlite::Connection::open(&db_path)
                .expect("failed to open db for quick_upload init");
            quick_upload::init_table(&conn);
            quick_upload::reset_uploading(&conn);
        }

        let infra = Arc::new(SharedInfra::new(base_url, cache_ttl_secs, db_path));

        let connection_observer: Arc<Mutex<Option<Box<dyn ConnectionObserver>>>> =
            Arc::new(Mutex::new(None));

        // Wire callback so SharedInfra notifies the connection observer when is_offline changes
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

        Self {
            infra,
            auth_provider,
            connection_observer,
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
        self.infra
            .connectivity
            .store(connected, std::sync::atomic::Ordering::Relaxed);
        if connected {
            self.infra.set_is_offline(false);
        }
        self.notify_connection_status();
        if connected {
            if let Ok(handle) = tokio::runtime::Handle::try_current() {
                let infra = Arc::clone(&self.infra);
                let module = Arc::clone(&self.quick_uploads);
                let token = self.get_auth_token();
                handle.spawn(async move {
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
        let token = self.get_auth_token();

        let (user_id, default_asset_id, default_asset_ticker, onboarding_version) =
            match self.infra.get("/api/auth/me", token.as_deref()).await {
                Ok(resp) => match serde_json::from_str::<serde_json::Value>(&resp.body) {
                    Ok(v) => {
                        let user_id = v["user_id"].as_str().map(|s| s.to_string());
                        let default_asset_id =
                            v["default_asset"]["id"].as_i64().map(|id| id as i32);
                        let default_asset_ticker =
                            v["default_asset"]["ticker"].as_str().map(|s| s.to_string());
                        let onboarding_version = v["onboarding_version"].as_i64().map(|n| n as i32);
                        (
                            user_id,
                            default_asset_id,
                            default_asset_ticker,
                            onboarding_version,
                        )
                    }
                    Err(_) => (self.auth_provider.get_user_id(), None, None, None),
                },
                Err(_) => (self.auth_provider.get_user_id(), None, None, None),
            };

        tracing::info!(
            "AppStore::on_sign_in user_id={:?} default_asset_id={:?} default_asset_ticker={:?} onboarding_version={:?}",
            user_id,
            default_asset_id,
            default_asset_ticker,
            onboarding_version
        );
        *self.infra.user_id.lock().unwrap() = user_id;
        if let Some(id) = default_asset_id {
            self.infra.set_default_asset_id(id);
        }
        if let Some(ticker) = default_asset_ticker {
            self.infra.set_default_asset_ticker(ticker);
        }
        if let Some(v) = onboarding_version {
            self.infra.set_onboarding_version(v);
        }

        // Trigger initial quick uploads fetch
        let infra = Arc::clone(&self.infra);
        let module = Arc::clone(&self.quick_uploads);
        let token_clone = token.clone();
        tokio::spawn(async move {
            quick_uploads::fetch_and_update(&infra, &module, token_clone.as_deref()).await;
        });
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
        let token = self.get_auth_token();
        portfolio::load_portfolio(&self.infra, &self.portfolio, token.as_deref()).await;
    }

    pub async fn refresh_portfolio(&self) {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        accounts::load_accounts(&self.infra, &self.accounts, token.as_deref()).await;
    }

    pub async fn refresh_accounts(&self) {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        categories::load_categories(&self.infra, &self.categories, token.as_deref()).await;
    }

    pub async fn refresh_categories(&self) {
        let token = self.get_auth_token();
        categories::refresh_categories(&self.infra, &self.categories, token.as_deref()).await;
    }

    pub async fn create_category(
        &self,
        name: String,
        icon: String,
        type_id: i32,
    ) -> Result<(), ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        categories::delete_category(&self.infra, &self.categories, id, token.as_deref()).await
    }

    pub async fn create_category_type(&self, name: String) -> Result<(), ApiError> {
        let token = self.get_auth_token();
        categories::create_category_type(&self.infra, &self.categories, name, token.as_deref())
            .await
    }

    pub async fn update_category_type(&self, id: i32, name: String) -> Result<(), ApiError> {
        let token = self.get_auth_token();
        categories::update_category_type(&self.infra, &self.categories, id, name, token.as_deref())
            .await
    }

    pub async fn delete_category_type(&self, id: i32) -> Result<(), ApiError> {
        let token = self.get_auth_token();
        categories::delete_category_type(&self.infra, &self.categories, id, token.as_deref()).await
    }

    pub async fn update_base_asset(&self, asset_id: i32, ticker: String) -> Result<(), ApiError> {
        let token = self.get_auth_token();
        assets::update_base_asset(&self.infra, asset_id, ticker, token.as_deref()).await?;
        self.refresh_portfolio().await;
        self.refresh_accounts().await;
        Ok(())
    }

    pub async fn set_onboarding_version(&self, version: i32) -> Result<(), ApiError> {
        let token = self.get_auth_token();
        onboarding::set_onboarding_version(&self.infra, version, token.as_deref()).await
    }

    pub async fn create_account(
        &self,
        input: CreateAccountInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token();
        accounts::create_account(&self.infra, &self.accounts, input, token.as_deref()).await
    }

    pub async fn get_account_types(
        &self,
    ) -> Result<Vec<crate::models::AccountTypeItem>, crate::error::ApiError> {
        let token = self.get_auth_token();
        accounts::get_account_types(&self.infra, token.as_deref()).await
    }

    pub async fn update_account(
        &self,
        account_id: String,
        input: UpdateAccountInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        accounts::delete_account(&self.infra, &self.accounts, &account_id, token.as_deref()).await
    }

    pub async fn get_account(
        &self,
        account_id: String,
    ) -> Result<crate::models::AccountEditModel, crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        account_transactions::load_account_transactions(
            &self.infra,
            &self.account_transactions,
            &account_id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn load_more_account_transactions(&self) {
        let token = self.get_auth_token();
        account_transactions::load_more_account_transactions(
            &self.infra,
            &self.account_transactions,
            token.as_deref(),
        )
        .await;
    }

    pub async fn refresh_account_transactions(&self) {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        asset_detail::refresh_asset_detail(&self.infra, &self.asset_detail, token.as_deref()).await;
    }

    pub async fn load_asset_detail_base_chart(&self) {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        transactions::load_transactions(&self.infra, &self.transactions, token.as_deref()).await;
    }

    pub async fn load_more_transactions(&self) {
        let token = self.get_auth_token();
        transactions::load_more_transactions(&self.infra, &self.transactions, token.as_deref())
            .await;
    }

    pub async fn refresh_transactions(&self) {
        let token = self.get_auth_token();
        transactions::refresh_transactions(&self.infra, &self.transactions, token.as_deref()).await;
    }

    pub async fn delete_transaction(&self, tx_id: String) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token();
        transactions::delete_transaction(&self.infra, &self.transactions, &tx_id, token.as_deref())
            .await
    }

    pub async fn delete_transaction_group(
        &self,
        group_id: String,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token();
        transactions::delete_transaction_group(
            &self.infra,
            &self.transactions,
            &group_id,
            token.as_deref(),
        )
        .await
    }

    // ── Transactions (direct return) ─────────────────────────────────────

    pub async fn get_editable_transaction(
        &self,
        tx_id: String,
    ) -> Result<crate::models::EditableTransaction, crate::error::ApiError> {
        let token = self.get_auth_token();
        transactions::get_editable_transaction(&self.infra, &tx_id, token.as_deref()).await
    }

    pub async fn create_individual_transaction(
        &self,
        input: crate::models::CreateTransactionInput,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        transactions::create_transaction_group(
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
        let token = self.get_auth_token();
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

    // ── Assets (direct return) ───────────────────────────────────────────
    pub async fn search_global_assets(
        &self,
        query: String,
        start: i32,
        count: i32,
    ) -> Result<crate::models::AssetSearchPage, crate::error::ApiError> {
        let token = self.get_auth_token();
        assets::search_global_assets(&self.infra, &query, start, count, token.as_deref()).await
    }
    pub async fn get_asset_detail(
        &self,
        asset_id: i32,
        user_asset: bool,
    ) -> Result<crate::models::AssetDetail, crate::error::ApiError> {
        let token = self.get_auth_token();
        assets::get_asset_detail(&self.infra, asset_id, user_asset, token.as_deref()).await
    }
    pub async fn get_asset_pair(
        &self,
        asset_id: i32,
        reference_id: i32,
        user_asset: bool,
    ) -> Result<crate::models::AssetPairDetail, crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        assets::get_asset_types(&self.infra, token.as_deref()).await
    }
    pub async fn get_user_assets(
        &self,
    ) -> Result<Vec<crate::models::AssetSummary>, crate::error::ApiError> {
        let token = self.get_auth_token();
        assets::get_user_assets(&self.infra, token.as_deref()).await
    }
    pub async fn create_user_asset(
        &self,
        name: String,
        ticker: String,
        asset_type: i32,
        base_asset_id: i32,
    ) -> Result<i32, crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        assets::add_user_asset_pair(&self.infra, asset_id, reference_id, token.as_deref()).await
    }
    pub async fn add_user_asset_rate(
        &self,
        asset_id: i32,
        reference_id: i32,
        date: i64,
        rate: f64,
    ) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        assets::delete_user_asset(&self.infra, asset_id, token.as_deref()).await
    }
    pub async fn search_assets(
        &self,
        query: String,
    ) -> Result<Vec<crate::models::AssetItem>, crate::error::ApiError> {
        let token = self.get_auth_token();
        transactions::search_assets(&self.infra, &query, token.as_deref()).await
    }

    pub async fn get_all_currencies(&self) -> Result<Vec<crate::models::AssetItem>, ApiError> {
        let token = self.get_auth_token();
        transactions::get_all_currencies(&self.infra, token.as_deref()).await
    }

    pub async fn get_all_categories(
        &self,
    ) -> Result<Vec<crate::models::CategoryItem>, crate::error::ApiError> {
        let token = self.get_auth_token();
        transactions::get_all_categories(&self.infra, token.as_deref()).await
    }

    pub async fn get_accounts_list(
        &self,
    ) -> Result<Vec<crate::models::AccountItem>, crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        quick_uploads::dismiss_quick_upload(
            &self.infra,
            &self.quick_uploads,
            &id,
            token.as_deref(),
        )
        .await;
    }

    pub async fn complete_quick_upload(&self, upload_id: String, accepted: bool) {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        quick_uploads::get_quick_upload_detail(&self.infra, &upload_id, token.as_deref()).await
    }

    pub async fn send_quick_upload_correction(
        &self,
        upload_id: String,
        message: String,
    ) -> Result<QuickUploadDetail, ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        quick_uploads::flush_and_subscribe(&self.infra, &self.quick_uploads, token.as_deref())
            .await;
    }

    pub fn get_cached_me(&self) -> Option<AuthMe> {
        let url = format!("{}/api/auth/me", self.infra.base_url);
        let body = self.infra.persistent_cache.get(&url)?;
        serde_json::from_str(&body).ok()
    }

    // ── AI Usage ──────────────────────────────────────────────────────────

    pub async fn get_ai_usage(&self) -> Result<crate::models::AiUsage, crate::error::ApiError> {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
        ai_chat::load_conversations(&self.infra, &self.ai_chat, token.as_deref()).await;
    }

    pub async fn create_conversation(&self) -> Result<String, crate::error::ApiError> {
        let token = self.get_auth_token();
        ai_chat::create_conversation(&self.infra, &self.ai_chat, token.as_deref()).await
    }

    pub async fn delete_conversation(&self, id: String) -> Result<(), crate::error::ApiError> {
        let token = self.get_auth_token();
        ai_chat::delete_conversation(&self.infra, &self.ai_chat, &id, token.as_deref()).await
    }

    pub async fn load_messages(&self, conversation_id: String) {
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
        let token = self.get_auth_token();
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
}

impl AppStore {
    pub(crate) fn get_auth_token(&self) -> Option<String> {
        self.auth_provider.get_token()
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
