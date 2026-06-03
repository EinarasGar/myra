use std::sync::Mutex;

use super::infra::SharedInfra;
use crate::api::account_overview::extract_account_balance;
use crate::api::accounts::extract_accounts;
use crate::models::AccountsState;

#[uniffi::export(callback_interface)]
pub trait AccountsObserver: Send + Sync {
    fn on_accounts_changed(&self, state: AccountsState);
}

pub struct AccountsModule {
    state: AccountsState,
    observer: Option<Box<dyn AccountsObserver>>,
}

impl Default for AccountsModule {
    fn default() -> Self {
        Self::new()
    }
}

impl AccountsModule {
    pub fn new() -> Self {
        Self {
            state: AccountsState {
                is_loading: false,
                is_loading_balances: false,
                error: None,
                accounts: vec![],
                total_net_worth: 0.0,
            },
            observer: None,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn AccountsObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = AccountsState {
            is_loading: false,
            is_loading_balances: false,
            error: None,
            accounts: vec![],
            total_net_worth: 0.0,
        };
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_accounts_changed(self.state.clone());
        }
    }
}

pub async fn load_accounts(
    infra: &SharedInfra,
    module: &Mutex<AccountsModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    // Phase 1: Load accounts list
    {
        let mut m = module.lock().unwrap();
        m.state.is_loading = true;
        m.notify();
    }

    let path = format!("/api/users/{user_id}/accounts");
    let accounts = match infra.get(&path, auth_token).await {
        Ok(resp) => match extract_accounts(&resp.body) {
            Ok(items) => items,
            Err(e) => {
                let mut m = module.lock().unwrap();
                m.state.error = Some(e);
                m.state.is_loading = false;
                m.notify();
                return;
            }
        },
        Err(e) => {
            let mut m = module.lock().unwrap();
            m.state.error = Some(e.to_string());
            m.state.is_loading = false;
            m.notify();
            return;
        }
    };

    // Emit accounts with balance=None, start loading balances
    {
        let mut m = module.lock().unwrap();
        m.state.accounts = accounts.clone();
        m.state.error = None;
        m.state.is_loading = false;
        m.state.is_loading_balances = true;
        m.notify();
    }

    // Phase 2: Fetch portfolio overview for each account concurrently
    let balance_paths: Vec<String> = accounts
        .iter()
        .map(|acc| {
            format!(
                "/api/users/{user_id}/accounts/{}/portfolio/overview",
                acc.id
            )
        })
        .collect();

    let balance_futures: Vec<_> = balance_paths
        .iter()
        .map(|path| infra.get(path, auth_token))
        .collect();

    let balance_results = futures_util::future::join_all(balance_futures).await;

    // Update accounts with balance data
    let mut updated_accounts = accounts;
    let mut total_net_worth = 0.0;

    for (i, result) in balance_results.into_iter().enumerate() {
        if let Ok(resp) = result {
            if let Ok(summary) = extract_account_balance(&resp.body) {
                if i < updated_accounts.len() {
                    updated_accounts[i].balance = Some(summary.balance);
                    updated_accounts[i].unrealized_gain = Some(summary.unrealized_gain);
                    updated_accounts[i].holdings_count = Some(summary.holdings_count);
                    total_net_worth += summary.balance;
                }
            }
        }
    }

    // Emit final state
    {
        let mut m = module.lock().unwrap();
        m.state.accounts = updated_accounts;
        m.state.total_net_worth = total_net_worth;
        m.state.is_loading_balances = false;
        m.notify();
    }
}

pub async fn refresh_accounts(
    infra: &SharedInfra,
    module: &Mutex<AccountsModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/accounts", user_id));
    load_accounts(infra, module, auth_token).await;
}
