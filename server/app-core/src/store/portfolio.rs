use std::sync::Mutex;

use shared::view_models::portfolio::get_networth_history::GetNetWorthHistoryResponseViewModel;

use crate::api::holdings::extract_holdings;
use crate::models::{ChartPeriodData, ChartPoint, HoldingItem, PortfolioState};
use super::infra::SharedInfra;

const RANGES: &[&str] = &["1d", "1w", "1m", "3m", "6m", "1y", "all"];
const LABELS: &[&str] = &["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"];

#[uniffi::export(callback_interface)]
pub trait PortfolioObserver: Send + Sync {
    fn on_portfolio_changed(&self, state: PortfolioState);
}

pub struct PortfolioModule {
    state: PortfolioState,
    observer: Option<Box<dyn PortfolioObserver>>,
}

impl PortfolioModule {
    pub fn new() -> Self {
        Self {
            state: PortfolioState {
                is_loading: false,
                error: None,
                holdings: vec![],
                chart_data: vec![],
            },
            observer: None,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn PortfolioObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = PortfolioState {
            is_loading: false,
            error: None,
            holdings: vec![],
            chart_data: vec![],
        };
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_portfolio_changed(self.state.clone());
        }
    }
}

pub async fn load_portfolio(
    infra: &SharedInfra,
    module: &Mutex<PortfolioModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    // Try to load cached holdings and chart data, emit with is_loading=true
    let holdings_path = format!("/api/users/{user_id}/portfolio/holdings");
    let holdings_url = format!("{}{}", infra.base_url, holdings_path);
    let cached_holdings: Option<Vec<HoldingItem>> = infra
        .persistent_cache
        .get(&holdings_url)
        .and_then(|body| extract_holdings(&body).ok());

    let mut cached_chart_data: Vec<ChartPeriodData> = Vec::new();
    for (i, range) in RANGES.iter().enumerate() {
        let chart_url = format!(
            "{}/api/users/{user_id}/portfolio/history?range={range}",
            infra.base_url
        );
        if let Some(body) = infra.persistent_cache.get(&chart_url) {
            if let Ok(resp) = serde_json::from_str::<GetNetWorthHistoryResponseViewModel>(&body) {
                cached_chart_data.push(ChartPeriodData {
                    period: LABELS[i].to_string(),
                    points: resp
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

    // Emit cached state with is_loading=true
    {
        let mut m = module.lock().unwrap();
        if let Some(ref holdings) = cached_holdings {
            m.state.holdings = holdings.clone();
        }
        if !cached_chart_data.is_empty() {
            m.state.chart_data = cached_chart_data;
        }
        m.state.is_loading = true;
        m.state.error = None;
        m.notify();
    }

    // Fetch fresh data
    fetch_fresh(infra, module, &user_id, auth_token, cached_holdings.is_some()).await;
}

pub async fn refresh_portfolio(
    infra: &SharedInfra,
    module: &Mutex<PortfolioModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/portfolio", user_id));

    {
        let mut m = module.lock().unwrap();
        m.state.is_loading = true;
        m.state.error = None;
        m.notify();
    }

    fetch_fresh(infra, module, &user_id, auth_token, true).await;
}

async fn fetch_fresh(
    infra: &SharedInfra,
    module: &Mutex<PortfolioModule>,
    user_id: &str,
    auth_token: Option<&str>,
    had_cached: bool,
) {
    let holdings_path = format!("/api/users/{user_id}/portfolio/holdings");

    // Build chart paths upfront so they live long enough for the futures
    let chart_paths: Vec<String> = RANGES
        .iter()
        .map(|range| format!("/api/users/{user_id}/portfolio/history?range={range}"))
        .collect();

    let chart_futures: Vec<_> = chart_paths
        .iter()
        .map(|path| infra.get(path, auth_token))
        .collect();

    // Fetch holdings and all chart periods concurrently
    let (holdings_result, chart_results) = tokio::join!(
        infra.get(&holdings_path, auth_token),
        futures_util::future::join_all(chart_futures),
    );

    let holdings: Option<Vec<HoldingItem>> = match holdings_result {
        Ok(resp) => match extract_holdings(&resp.body) {
            Ok(items) => Some(items),
            Err(_) => None,
        },
        Err(_) => None,
    };

    let mut chart_data: Vec<ChartPeriodData> = Vec::new();
    let mut chart_error: Option<String> = None;

    for (i, result) in chart_results.into_iter().enumerate() {
        match result {
            Ok(resp) => {
                match serde_json::from_str::<GetNetWorthHistoryResponseViewModel>(&resp.body) {
                    Ok(parsed) => {
                        chart_data.push(ChartPeriodData {
                            period: LABELS[i].to_string(),
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
                    Err(e) => {
                        chart_error = Some(e.to_string());
                    }
                }
            }
            Err(e) => {
                chart_error = Some(e.to_string());
            }
        }
    }

    let mut m = module.lock().unwrap();
    if let Some(h) = holdings {
        m.state.holdings = h;
        if !chart_data.is_empty() {
            m.state.chart_data = chart_data;
        }
        m.state.error = None;
    } else if had_cached {
        // Keep existing items but set error
        m.state.error = chart_error.or(Some("Failed to load portfolio".to_string()));
    } else {
        m.state.error = Some("Failed to load portfolio".to_string());
    }
    m.state.is_loading = false;
    m.notify();
}
