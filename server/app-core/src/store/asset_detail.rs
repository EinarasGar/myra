use std::sync::Mutex;

use super::infra::SharedInfra;
use super::{CHART_LABELS, CHART_RANGES};
use crate::api::account_overview::extract_account_overview;
use crate::api::asset_rates::extract_asset_rates;
use crate::api::assets::extract_asset_base_pair_id;
use crate::models::{AssetDetailState, ChartPeriodData};

#[uniffi::export(callback_interface)]
pub trait AssetDetailObserver: Send + Sync {
    fn on_asset_detail_changed(&self, state: AssetDetailState);
}

pub struct AssetDetailModule {
    state: AssetDetailState,
    observer: Option<Box<dyn AssetDetailObserver>>,
    account_id: String,
    asset_id: i32,
}

impl AssetDetailModule {
    pub fn new() -> Self {
        Self {
            state: AssetDetailState {
                is_loading: false,
                error: None,
                asset_id: 0,
                ticker: String::new(),
                name: String::new(),
                units: 0.0,
                value: 0.0,
                cost_basis: 0.0,
                unrealized_gains: 0.0,
                total_fees: 0.0,
                current_price: 0.0,
                chart_data: vec![],
                lots: vec![],
            },
            observer: None,
            account_id: String::new(),
            asset_id: 0,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn AssetDetailObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = AssetDetailState {
            is_loading: false,
            error: None,
            asset_id: 0,
            ticker: String::new(),
            name: String::new(),
            units: 0.0,
            value: 0.0,
            cost_basis: 0.0,
            unrealized_gains: 0.0,
            total_fees: 0.0,
            current_price: 0.0,
            chart_data: vec![],
            lots: vec![],
        };
        self.account_id = String::new();
        self.asset_id = 0;
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_asset_detail_changed(self.state.clone());
        }
    }
}

pub async fn load_asset_detail(
    infra: &SharedInfra,
    module: &Mutex<AssetDetailModule>,
    account_id: &str,
    asset_id: i32,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    {
        let mut m = module.lock().unwrap();
        m.account_id = account_id.to_string();
        m.asset_id = asset_id;
        m.state.is_loading = true;
        m.state.asset_id = asset_id;
        m.notify();
    }

    // Phase 1: Fetch overview and asset metadata to resolve reference_id
    let overview_path = format!("/api/users/{user_id}/accounts/{account_id}/portfolio/overview");
    let asset_meta_path = format!("/api/assets/{asset_id}");

    let (overview_result, asset_meta_result) = tokio::join!(
        infra.get(&overview_path, auth_token),
        infra.get(&asset_meta_path, auth_token),
    );

    // Resolve reference_id: asset's own base_pair > user default > asset_id fallback
    let reference_id = asset_meta_result
        .as_ref()
        .ok()
        .and_then(|r| extract_asset_base_pair_id(&r.body).ok())
        .or_else(|| infra.default_asset_id())
        .unwrap_or(asset_id);

    // Phase 2: Fetch rate chart data with resolved reference_id
    let rate_paths: Vec<String> = CHART_RANGES
        .iter()
        .map(|range| format!("/api/assets/{asset_id}/{reference_id}/rates?range={range}"))
        .collect();

    let rate_futures: Vec<_> = rate_paths
        .iter()
        .map(|path| infra.get(path, auth_token))
        .collect();

    let rate_results = futures_util::future::join_all(rate_futures).await;

    let mut m = module.lock().unwrap();
    let mut error: Option<String> = None;

    // Process overview — find the specific asset
    if let Ok(resp) = overview_result {
        match extract_account_overview(&resp.body) {
            Ok(data) => {
                if let Some(holding) = data.holdings.iter().find(|h| h.asset_id == asset_id) {
                    m.state.ticker = holding.ticker.clone();
                    m.state.name = holding.name.clone();
                    m.state.units = holding.units;
                    m.state.value = holding.value;
                    m.state.cost_basis = holding.cost_basis;
                    m.state.unrealized_gains = holding.unrealized_gains;
                    m.state.total_fees = holding.total_fees;
                    m.state.current_price = holding.current_price;
                } else {
                    error = Some(format!("Asset {} not found in account", asset_id));
                }

                // Extract lots for this asset
                if let Some(lots) = data.lots_by_asset.get(&asset_id) {
                    m.state.lots = lots.clone();
                } else {
                    m.state.lots = vec![];
                }
            }
            Err(e) => error = Some(e),
        }
    } else if let Err(e) = overview_result {
        error = Some(e.to_string());
    }

    // Process rate chart data
    let mut chart_data: Vec<ChartPeriodData> = Vec::new();
    for (i, result) in rate_results.into_iter().enumerate() {
        if let Ok(resp) = result {
            if let Ok(points) = extract_asset_rates(&resp.body) {
                chart_data.push(ChartPeriodData {
                    period: CHART_LABELS[i].to_string(),
                    points,
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

pub async fn refresh_asset_detail(
    infra: &SharedInfra,
    module: &Mutex<AssetDetailModule>,
    auth_token: Option<&str>,
) {
    let (account_id, asset_id) = {
        let m = module.lock().unwrap();
        (m.account_id.clone(), m.asset_id)
    };

    if account_id.is_empty() {
        return;
    }

    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    infra.evict_memory_cache_prefix(&format!("/api/users/{}/accounts/{}", user_id, account_id));
    infra.evict_memory_cache_prefix(&format!("/api/assets/{}", asset_id));

    load_asset_detail(infra, module, &account_id, asset_id, auth_token).await;
}
