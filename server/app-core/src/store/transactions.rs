use std::sync::Mutex;

use shared::view_models::transactions::update_individual_transaction::UpdateIndividualTransactionResponseViewModel;

use crate::api::accounts::extract_accounts;
use crate::api::assets::extract_assets;
use crate::api::categories::extract_categories;
use crate::api::create_transaction::build_request_body;
use crate::api::create_transaction_group::build_create_group_request_body;
use crate::api::get_transaction::extract_editable_transaction;
use crate::api::transactions::{extract_page, to_list_item_with_id};
use crate::api::update_transaction::build_update_request_body;
use crate::api::update_transaction_group::build_update_group_request_body;
use crate::error::ApiError;
use crate::models::{
    AccountItem, AssetItem, CategoryItem, CreateTransactionGroupInput, CreateTransactionInput,
    EditableTransaction, TransactionListItem, TransactionsState,
};

use super::infra::SharedInfra;

#[uniffi::export(callback_interface)]
pub trait TransactionsObserver: Send + Sync {
    fn on_transactions_changed(&self, state: TransactionsState);
}

pub struct TransactionsModule {
    state: TransactionsState,
    observer: Option<Box<dyn TransactionsObserver>>,
    next_cursor: Option<String>,
}

impl TransactionsModule {
    pub fn new() -> Self {
        Self {
            state: TransactionsState {
                is_loading: false,
                is_loading_more: false,
                error: None,
                items: vec![],
                has_more: false,
            },
            observer: None,
            next_cursor: None,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn TransactionsObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = TransactionsState {
            is_loading: false,
            is_loading_more: false,
            error: None,
            items: vec![],
            has_more: false,
        };
        self.next_cursor = None;
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_transactions_changed(self.state.clone());
        }
    }
}

pub async fn load_transactions(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    let path = format!("/api/users/{user_id}/transactions?limit=25");
    let url = format!("{}{}", infra.base_url, path);

    // Check persistent cache, emit cached state with is_loading=true
    let cached_body = infra.persistent_cache.get(&url);
    if let Some(ref body) = cached_body {
        if let Ok(page) = extract_page(body) {
            let mut m = module.lock().unwrap();
            m.state.items = page.items;
            m.state.has_more = page.has_more;
            m.next_cursor = page.next_cursor;
            m.state.is_loading = true;
            m.state.error = None;
            m.notify();
        }
    }

    if cached_body.is_none() {
        let mut m = module.lock().unwrap();
        m.state.is_loading = true;
        m.notify();
    }

    match infra.get(&path, auth_token).await {
        Ok(resp) => match extract_page(&resp.body) {
            Ok(page) => {
                let mut m = module.lock().unwrap();
                m.state.items = page.items;
                m.state.has_more = page.has_more;
                m.next_cursor = page.next_cursor;
                m.state.is_loading = false;
                m.state.error = None;
                m.notify();
            }
            Err(e) => {
                let mut m = module.lock().unwrap();
                m.state.error = Some(e);
                m.state.is_loading = false;
                m.notify();
            }
        },
        Err(e) => {
            let mut m = module.lock().unwrap();
            m.state.error = Some(e.to_string());
            m.state.is_loading = false;
            m.notify();
        }
    }
}

pub async fn load_more_transactions(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    let cursor = {
        let m = module.lock().unwrap();
        if !m.state.has_more || m.state.is_loading_more {
            return;
        }
        m.next_cursor.clone()
    };

    {
        let mut m = module.lock().unwrap();
        m.state.is_loading_more = true;
        m.notify();
    }

    let path = match cursor {
        Some(ref c) => format!("/api/users/{user_id}/transactions?limit=25&cursor={c}"),
        None => format!("/api/users/{user_id}/transactions?limit=25"),
    };

    match infra.get(&path, auth_token).await {
        Ok(resp) => match extract_page(&resp.body) {
            Ok(page) => {
                let mut m = module.lock().unwrap();
                m.state.items.extend(page.items);
                m.state.has_more = page.has_more;
                m.next_cursor = page.next_cursor;
                m.state.is_loading_more = false;
                m.notify();
            }
            Err(_) => {
                let mut m = module.lock().unwrap();
                m.state.is_loading_more = false;
                m.notify();
            }
        },
        Err(_) => {
            let mut m = module.lock().unwrap();
            m.state.is_loading_more = false;
            m.notify();
        }
    }
}

pub async fn refresh_transactions(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/transactions", user_id));

    {
        let mut m = module.lock().unwrap();
        m.state.is_loading = true;
        m.state.error = None;
        m.notify();
    }

    let path = format!("/api/users/{user_id}/transactions?limit=25");
    match infra.get(&path, auth_token).await {
        Ok(resp) => match extract_page(&resp.body) {
            Ok(page) => {
                let mut m = module.lock().unwrap();
                m.state.items = page.items;
                m.state.has_more = page.has_more;
                m.next_cursor = page.next_cursor;
                m.state.is_loading = false;
                m.state.error = None;
                m.notify();
            }
            Err(e) => {
                let mut m = module.lock().unwrap();
                m.state.error = Some(e);
                m.state.is_loading = false;
                m.notify();
            }
        },
        Err(e) => {
            let mut m = module.lock().unwrap();
            m.state.error = Some(e.to_string());
            m.state.is_loading = false;
            m.notify();
        }
    }
}

pub async fn delete_transaction(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    tx_id: &str,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let path = format!("/api/users/{user_id}/transactions/{tx_id}");
    let resp = infra.delete(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/transactions", user_id));
    refresh_transactions(infra, module, auth_token).await;
    Ok(())
}

pub async fn delete_transaction_group(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    group_id: &str,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let path = format!("/api/users/{user_id}/transactions/groups/{group_id}");
    let resp = infra.delete(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/transactions", user_id));
    refresh_transactions(infra, module, auth_token).await;
    Ok(())
}

pub async fn get_editable_transaction(
    infra: &SharedInfra,
    tx_id: &str,
    auth_token: Option<&str>,
) -> Result<EditableTransaction, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let path = format!("/api/users/{user_id}/transactions/individual/{tx_id}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }

    extract_editable_transaction(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn create_individual_transaction(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    input: CreateTransactionInput,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let body = build_request_body(input)?;
    let path = format!("/api/users/{user_id}/transactions/individual");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/transactions", user_id));
    refresh_transactions(infra, module, auth_token).await;
    Ok(())
}

pub async fn update_individual_transaction(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    tx_id: &str,
    input: CreateTransactionInput,
    auth_token: Option<&str>,
) -> Result<TransactionListItem, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let body = build_update_request_body(input)?;
    let path = format!("/api/users/{user_id}/transactions/individual/{tx_id}");
    let resp = infra.put(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }

    let parsed: UpdateIndividualTransactionResponseViewModel =
        serde_json::from_str(&resp.body).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

    let list_item = to_list_item_with_id(tx_id.to_string(), &parsed.transaction, &parsed.metadata);

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/transactions", user_id));
    refresh_transactions(infra, module, auth_token).await;

    Ok(list_item)
}

pub async fn create_transaction_group(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    input: CreateTransactionGroupInput,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let body = build_create_group_request_body(input)?;
    let path = format!("/api/users/{user_id}/transactions/groups");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/transactions", user_id));
    refresh_transactions(infra, module, auth_token).await;
    Ok(())
}

pub async fn update_transaction_group(
    infra: &SharedInfra,
    module: &Mutex<TransactionsModule>,
    group_id: &str,
    input: CreateTransactionGroupInput,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let body = build_update_group_request_body(input)?;
    let path = format!("/api/users/{user_id}/transactions/groups/{group_id}");
    let resp = infra.put(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/transactions", user_id));
    refresh_transactions(infra, module, auth_token).await;
    Ok(())
}

pub async fn search_assets(
    infra: &SharedInfra,
    query: &str,
    auth_token: Option<&str>,
) -> Result<Vec<AssetItem>, ApiError> {
    let encoded = urlencoding::encode(query);
    let path = format!("/api/assets?count=20&start=0&query={encoded}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }
    extract_assets(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn search_categories(
    infra: &SharedInfra,
    query: &str,
    auth_token: Option<&str>,
) -> Result<Vec<CategoryItem>, ApiError> {
    let encoded = urlencoding::encode(query);
    let path = format!("/api/categories?count=20&start=0&query={encoded}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }
    extract_categories(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn get_accounts_list(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<Vec<AccountItem>, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let path = format!("/api/users/{user_id}/accounts");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(ApiError::Server {
            reason: format!("HTTP {}", resp.status),
            status: resp.status,
        });
    }
    extract_accounts(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}
