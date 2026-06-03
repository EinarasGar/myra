use std::sync::Mutex;

use shared::view_models::portfolio::get_networth_history::GetNetWorthHistoryResponseViewModel;

use super::infra::SharedInfra;
use super::{CHART_LABELS, CHART_RANGES};
use crate::api::account_overview::extract_account_overview;
use crate::api::account_transactions::extract_account_transactions;
use crate::models::{AccountDetailState, ChartPeriodData, ChartPoint};

#[uniffi::export(callback_interface)]
pub trait AccountDetailObserver: Send + Sync {
    fn on_account_detail_changed(&self, state: AccountDetailState);
}

pub struct AccountDetailModule {
    state: AccountDetailState,
    observer: Option<Box<dyn AccountDetailObserver>>,
    account_id: String,
}

impl Default for AccountDetailModule {
    fn default() -> Self {
        Self::new()
    }
}

impl AccountDetailModule {
    pub fn new() -> Self {
        Self {
            state: AccountDetailState {
                is_loading: false,
                error: None,
                account_id: String::new(),
                account_name: String::new(),
                account_type_id: 0,
                chart_data: vec![],
                holdings: vec![],
                cash_balance: 0.0,
                total_value: 0.0,
                total_cost_basis: 0.0,
                unrealized_gains: 0.0,
                realized_gains: 0.0,
                total_fees: 0.0,
                recent_transactions: vec![],
            },
            observer: None,
            account_id: String::new(),
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn AccountDetailObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = AccountDetailState {
            is_loading: false,
            error: None,
            account_id: String::new(),
            account_name: String::new(),
            account_type_id: 0,
            chart_data: vec![],
            holdings: vec![],
            cash_balance: 0.0,
            total_value: 0.0,
            total_cost_basis: 0.0,
            unrealized_gains: 0.0,
            realized_gains: 0.0,
            total_fees: 0.0,
            recent_transactions: vec![],
        };
        self.account_id = String::new();
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_account_detail_changed(self.state.clone());
        }
    }
}

pub async fn load_account_detail(
    infra: &SharedInfra,
    module: &Mutex<AccountDetailModule>,
    account_id: &str,
    account_name: &str,
    account_type_id: i32,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    {
        let mut m = module.lock().unwrap();
        m.account_id = account_id.to_string();
        m.state.is_loading = true;
        m.state.account_id = account_id.to_string();
        m.state.account_name = account_name.to_string();
        m.state.account_type_id = account_type_id;
        m.notify();
    }

    // Build paths
    let overview_path = format!("/api/users/{user_id}/accounts/{account_id}/portfolio/overview");
    let tx_path =
        format!("/api/users/{user_id}/accounts/{account_id}/transactions?count=5&start=0");
    let chart_paths: Vec<String> = CHART_RANGES
        .iter()
        .map(|range| {
            format!("/api/users/{user_id}/accounts/{account_id}/portfolio/history?range={range}")
        })
        .collect();

    let chart_futures: Vec<_> = chart_paths
        .iter()
        .map(|path| infra.get(path, auth_token))
        .collect();

    // Fetch overview, transactions, and all chart periods concurrently
    let (overview_result, tx_result, chart_results) = tokio::join!(
        infra.get(&overview_path, auth_token),
        infra.get(&tx_path, auth_token),
        futures_util::future::join_all(chart_futures),
    );

    let mut m = module.lock().unwrap();
    let mut error: Option<String> = None;

    // Process overview
    if let Ok(resp) = overview_result {
        match extract_account_overview(&resp.body) {
            Ok(data) => {
                m.state.holdings = data.holdings;
                m.state.cash_balance = data.cash_balance;
                m.state.total_value = data.total_value;
                m.state.total_cost_basis = data.total_cost_basis;
                m.state.unrealized_gains = data.unrealized_gains;
                m.state.realized_gains = data.realized_gains;
                m.state.total_fees = data.total_fees;
            }
            Err(e) => error = Some(e),
        }
    } else if let Err(e) = overview_result {
        error = Some(e.to_string());
    }

    // Process transactions
    if let Ok(resp) = tx_result {
        if let Ok(page) = extract_account_transactions(&resp.body) {
            m.state.recent_transactions = page.items;
        }
    }

    // Process chart data
    let mut chart_data: Vec<ChartPeriodData> = Vec::new();
    for (i, result) in chart_results.into_iter().enumerate() {
        if let Ok(resp) = result {
            if let Ok(parsed) =
                serde_json::from_str::<GetNetWorthHistoryResponseViewModel>(&resp.body)
            {
                chart_data.push(ChartPeriodData {
                    period: CHART_LABELS[i].to_string(),
                    points: parsed
                        .sums
                        .into_iter()
                        .map(|p| ChartPoint {
                            timestamp: p.date,
                            value: p.rate,
                        })
                        .collect(),
                });
            }
        }
    }
    if !chart_data.is_empty() {
        m.state.chart_data = chart_data;
    }

    m.state.error = error;
    m.state.is_loading = false;
    m.notify();
}

pub async fn refresh_account_detail(
    infra: &SharedInfra,
    module: &Mutex<AccountDetailModule>,
    auth_token: Option<&str>,
) {
    let (account_id, account_name, account_type_id) = {
        let m = module.lock().unwrap();
        (
            m.account_id.clone(),
            m.state.account_name.clone(),
            m.state.account_type_id,
        )
    };

    if account_id.is_empty() {
        return;
    }

    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/accounts/{}", user_id, account_id));
    load_account_detail(
        infra,
        module,
        &account_id,
        &account_name,
        account_type_id,
        auth_token,
    )
    .await;
}
