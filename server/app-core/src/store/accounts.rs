use std::sync::Mutex;

use crate::api::accounts::extract_accounts;
use crate::models::AccountsState;
use super::infra::SharedInfra;

#[uniffi::export(callback_interface)]
pub trait AccountsObserver: Send + Sync {
    fn on_accounts_changed(&self, state: AccountsState);
}

pub struct AccountsModule {
    state: AccountsState,
    observer: Option<Box<dyn AccountsObserver>>,
}

impl AccountsModule {
    pub fn new() -> Self {
        Self {
            state: AccountsState {
                is_loading: false,
                error: None,
                accounts: vec![],
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
            error: None,
            accounts: vec![],
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

    {
        let mut m = module.lock().unwrap();
        m.state.is_loading = true;
        m.notify();
    }

    let path = format!("/api/users/{user_id}/accounts");
    match infra.get(&path, auth_token).await {
        Ok(resp) => match extract_accounts(&resp.body) {
            Ok(items) => {
                let mut m = module.lock().unwrap();
                m.state.accounts = items;
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
