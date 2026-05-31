use std::sync::Mutex;

use super::infra::SharedInfra;
use crate::api::account_transactions::extract_account_transactions;
use crate::models::AccountTransactionsState;

const PAGE_SIZE: u32 = 20;

#[uniffi::export(callback_interface)]
pub trait AccountTransactionsObserver: Send + Sync {
    fn on_account_transactions_changed(&self, state: AccountTransactionsState);
}

pub struct AccountTransactionsModule {
    state: AccountTransactionsState,
    observer: Option<Box<dyn AccountTransactionsObserver>>,
    account_id: String,
    next_start: u32,
}

impl AccountTransactionsModule {
    pub fn new() -> Self {
        Self {
            state: AccountTransactionsState {
                is_loading: false,
                is_loading_more: false,
                error: None,
                items: vec![],
                has_more: false,
            },
            observer: None,
            account_id: String::new(),
            next_start: 0,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn AccountTransactionsObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = AccountTransactionsState {
            is_loading: false,
            is_loading_more: false,
            error: None,
            items: vec![],
            has_more: false,
        };
        self.account_id = String::new();
        self.next_start = 0;
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_account_transactions_changed(self.state.clone());
        }
    }
}

pub async fn load_account_transactions(
    infra: &SharedInfra,
    module: &Mutex<AccountTransactionsModule>,
    account_id: &str,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    {
        let mut m = module.lock().unwrap();
        m.account_id = account_id.to_string();
        m.next_start = 0;
        m.state.is_loading = true;
        m.state.items = vec![];
        m.notify();
    }

    let path = format!(
        "/api/users/{user_id}/accounts/{account_id}/transactions?count={PAGE_SIZE}&start=0"
    );

    match infra.get(&path, auth_token).await {
        Ok(resp) => match extract_account_transactions(&resp.body) {
            Ok(page) => {
                let mut m = module.lock().unwrap();
                m.state.items = page.items;
                m.state.has_more = page.has_more;
                m.next_start = PAGE_SIZE;
                m.state.error = None;
                m.state.is_loading = false;
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

pub async fn load_more_account_transactions(
    infra: &SharedInfra,
    module: &Mutex<AccountTransactionsModule>,
    auth_token: Option<&str>,
) {
    let (user_id, account_id, start) = {
        let m = module.lock().unwrap();
        if !m.state.has_more || m.state.is_loading_more {
            return;
        }
        let id = match infra.user_id() {
            Some(id) => id,
            None => return,
        };
        (id, m.account_id.clone(), m.next_start)
    };

    if account_id.is_empty() {
        return;
    }

    {
        let mut m = module.lock().unwrap();
        m.state.is_loading_more = true;
        m.notify();
    }

    let path = format!(
        "/api/users/{user_id}/accounts/{account_id}/transactions?count={PAGE_SIZE}&start={start}"
    );

    match infra.get(&path, auth_token).await {
        Ok(resp) => match extract_account_transactions(&resp.body) {
            Ok(page) => {
                let mut m = module.lock().unwrap();
                m.state.items.extend(page.items);
                m.state.has_more = page.has_more;
                m.next_start = start + PAGE_SIZE;
                m.state.is_loading_more = false;
                m.notify();
            }
            Err(e) => {
                let mut m = module.lock().unwrap();
                m.state.error = Some(e);
                m.state.is_loading_more = false;
                m.notify();
            }
        },
        Err(e) => {
            let mut m = module.lock().unwrap();
            m.state.error = Some(e.to_string());
            m.state.is_loading_more = false;
            m.notify();
        }
    }
}

pub async fn refresh_account_transactions(
    infra: &SharedInfra,
    module: &Mutex<AccountTransactionsModule>,
    auth_token: Option<&str>,
) {
    let account_id = {
        let m = module.lock().unwrap();
        m.account_id.clone()
    };

    if account_id.is_empty() {
        return;
    }

    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    infra.evict_memory_cache_prefix(&format!(
        "/api/users/{}/accounts/{}/transactions",
        user_id, account_id
    ));

    load_account_transactions(infra, module, &account_id, auth_token).await;
}
