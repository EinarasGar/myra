pub mod infra;
pub mod portfolio;
pub mod accounts;
pub mod transactions;
pub mod quick_uploads;
pub mod sse;

use std::sync::{Arc, Mutex};

use crate::api::quick_upload;
use crate::models::{AuthMe, ConnectionStatus, QuickUploadDetail};
use crate::error::ApiError;
use self::infra::SharedInfra;

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
    transactions: Mutex<transactions::TransactionsModule>,
    quick_uploads: Arc<Mutex<quick_uploads::QuickUploadsModule>>,
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

        tracing::info!(
            "AppStore::new base_url={} db_path={}",
            base_url,
            db_path
        );

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
            transactions: Mutex::new(transactions::TransactionsModule::new()),
            quick_uploads: Arc::new(Mutex::new(quick_uploads::QuickUploadsModule::new())),
        }
    }

    pub fn set_connectivity(&self, connected: bool) {
        self.infra.connectivity.store(connected, std::sync::atomic::Ordering::Relaxed);
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

    pub async fn on_sign_in(&self) {
        let token = self.get_auth_token();

        // Fetch user_id from the server (works in all auth modes including noauth)
        let user_id = match self.infra.get("/api/auth/me", token.as_deref()).await {
            Ok(resp) => {
                serde_json::from_str::<serde_json::Value>(&resp.body)
                    .ok()
                    .and_then(|v| v["user_id"].as_str().map(|s| s.to_string()))
            }
            Err(_) => self.auth_provider.get_user_id(),
        };

        tracing::info!("AppStore::on_sign_in user_id={:?}", user_id);
        *self.infra.user_id.lock().unwrap() = user_id;

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
        self.transactions.lock().unwrap().clear_state();
        self.quick_uploads.lock().unwrap().clear_state();
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
        transactions::refresh_transactions(&self.infra, &self.transactions, token.as_deref())
            .await;
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

    pub async fn search_assets(
        &self,
        query: String,
    ) -> Result<Vec<crate::models::AssetItem>, crate::error::ApiError> {
        let token = self.get_auth_token();
        transactions::search_assets(&self.infra, &query, token.as_deref()).await
    }

    pub async fn search_categories(
        &self,
        query: String,
    ) -> Result<Vec<crate::models::CategoryItem>, crate::error::ApiError> {
        let token = self.get_auth_token();
        transactions::search_categories(&self.infra, &query, token.as_deref()).await
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
        quick_uploads::dismiss_quick_upload(&self.infra, &self.quick_uploads, &id, token.as_deref())
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
