use std::sync::Mutex;

use super::infra::SharedInfra;
use super::{CHART_LABELS, CHART_RANGES};
use crate::api::asset_overview::extract_asset_overview;
use crate::api::asset_rates::extract_asset_rates;
use crate::api::assets::extract_asset_base_pair;
use crate::models::{AssetOverviewState, ChartPeriodData};

#[uniffi::export(callback_interface)]
pub trait AssetOverviewObserver: Send + Sync {
    fn on_asset_overview_changed(&self, state: AssetOverviewState);
}

pub struct AssetOverviewModule {
    state: AssetOverviewState,
    observer: Option<Box<dyn AssetOverviewObserver>>,
    asset_id: i32,
    reference_asset_id: i32,
}

impl Default for AssetOverviewModule {
    fn default() -> Self {
        Self::new()
    }
}

impl AssetOverviewModule {
    pub fn new() -> Self {
        Self {
            state: AssetOverviewState::default(),
            observer: None,
            asset_id: 0,
            reference_asset_id: 0,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn AssetOverviewObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = AssetOverviewState::default();
        self.asset_id = 0;
        self.reference_asset_id = 0;
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_asset_overview_changed(self.state.clone());
        }
    }
}

pub async fn load_asset_overview(
    infra: &SharedInfra,
    module: &Mutex<AssetOverviewModule>,
    asset_id: i32,
    reference_asset_id: i32,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    {
        let mut m = module.lock().unwrap();
        let asset_changed = m.asset_id != asset_id;
        m.asset_id = asset_id;
        m.reference_asset_id = reference_asset_id;
        if asset_changed {
            m.state.ticker = String::new();
            m.state.name = String::new();
            m.state.units = 0.0;
            m.state.value = 0.0;
            m.state.cost_basis = 0.0;
            m.state.unrealized_gains = 0.0;
            m.state.total_fees = 0.0;
            m.state.current_price = 0.0;
            m.state.lots = vec![];
        }
        m.state.is_loading = true;
        m.state.error = None;
        m.state.asset_id = asset_id;
        m.notify();
    }

    let overview_path =
        format!("/api/users/{user_id}/portfolio/assets/{asset_id}/overview?default_asset_id={reference_asset_id}");
    let asset_meta_path = format!("/api/assets/{asset_id}");
    let rate_paths: Vec<String> = CHART_RANGES
        .iter()
        .map(|range| format!("/api/assets/{asset_id}/{reference_asset_id}/rates?range={range}"))
        .collect();

    let (overview_result, asset_meta_result, rate_results) = tokio::join!(
        infra.get(&overview_path, auth_token),
        infra.get(&asset_meta_path, auth_token),
        futures_util::future::join_all(rate_paths.iter().map(|path| infra.get(path, auth_token))),
    );

    let base_pair = asset_meta_result
        .as_ref()
        .ok()
        .and_then(|r| extract_asset_base_pair(&r.body).ok());
    let reference_ticker = match base_pair {
        Some((_, ticker)) => Some(ticker),
        None => infra
            .default_asset_id()
            .and_then(|_| infra.default_asset_ticker()),
    };

    let mut m = module.lock().unwrap();
    let mut error: Option<String> = None;

    if let Ok(resp) = overview_result {
        match extract_asset_overview(&resp.body) {
            Ok(data) => {
                m.state.ticker = data.ticker;
                m.state.name = data.name;
                m.state.units = data.units;
                m.state.value = data.value;
                m.state.cost_basis = data.cost_basis;
                m.state.unrealized_gains = data.unrealized_gains;
                m.state.total_fees = data.total_fees;
                m.state.current_price = data.current_price;
                m.state.lots = data.lots;
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

    m.state.price_ticker = reference_ticker.unwrap_or_else(|| m.state.ticker.clone());
    m.state.error = error;
    m.state.is_loading = false;
    m.notify();
}

pub async fn refresh_asset_overview(
    infra: &SharedInfra,
    module: &Mutex<AssetOverviewModule>,
    auth_token: Option<&str>,
) {
    let (asset_id, reference_asset_id) = {
        let m = module.lock().unwrap();
        (m.asset_id, m.reference_asset_id)
    };

    if asset_id == 0 {
        return;
    }

    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    infra.evict_memory_cache_prefix(&format!(
        "/api/users/{}/portfolio/assets/{}",
        user_id, asset_id
    ));
    infra.evict_memory_cache_prefix(&format!("/api/assets/{}/", asset_id));

    load_asset_overview(infra, module, asset_id, reference_asset_id, auth_token).await;
}
