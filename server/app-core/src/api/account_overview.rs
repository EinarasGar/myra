use std::collections::HashMap;

use shared::view_models::portfolio::get_overview::GetPortfolioOverviewViewModel;

use crate::models::{AccountHoldingItem, LotItem};

pub struct AccountBalanceSummary {
    pub balance: f64,
    pub unrealized_gain: f64,
    pub holdings_count: u32,
}

pub struct AccountOverviewData {
    pub holdings: Vec<AccountHoldingItem>,
    pub cash_balance: f64,
    pub total_value: f64,
    pub total_cost_basis: f64,
    pub unrealized_gains: f64,
    pub realized_gains: f64,
    pub total_fees: f64,
    pub lots_by_asset: HashMap<i32, Vec<LotItem>>,
}

pub fn extract_account_balance(body: &str) -> Result<AccountBalanceSummary, String> {
    let resp: GetPortfolioOverviewViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;

    let mut cash_balance: f64 = 0.0;
    for cp in &resp.portfolios.cash_portfolios {
        let units: f64 = cp.units.to_string().parse().unwrap_or(0.0);
        cash_balance += units;
    }

    let mut asset_value: f64 = 0.0;
    let mut unrealized_gain: f64 = 0.0;
    let mut holdings_count: u32 = 0;

    for ap in &resp.portfolios.asset_portfolios {
        let total_units: f64 = ap.total_units.to_string().parse().unwrap_or(0.0);
        if total_units > 0.0 {
            let cost_basis: f64 = ap.total_cost_basis.to_string().parse().unwrap_or(0.0);
            let ug: f64 = ap.unrealized_gains.to_string().parse().unwrap_or(0.0);
            asset_value += cost_basis + ug;
            unrealized_gain += ug;
            holdings_count += 1;
        }
    }

    Ok(AccountBalanceSummary {
        balance: cash_balance + asset_value,
        unrealized_gain,
        holdings_count,
    })
}

pub fn extract_account_overview(body: &str) -> Result<AccountOverviewData, String> {
    let resp: GetPortfolioOverviewViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;

    let asset_map: HashMap<i32, _> = resp
        .lookup_tables
        .assets
        .iter()
        .map(|a| (a.asset_id.0, a))
        .collect();

    let mut holdings: Vec<AccountHoldingItem> = Vec::new();
    let mut lots_by_asset: HashMap<i32, Vec<LotItem>> = HashMap::new();
    let mut total_cost_basis: f64 = 0.0;
    let mut unrealized_gains: f64 = 0.0;
    let mut realized_gains: f64 = 0.0;
    let mut total_fees: f64 = 0.0;

    for ap in &resp.portfolios.asset_portfolios {
        let units: f64 = ap.total_units.to_string().parse().unwrap_or(0.0);
        let cb: f64 = ap.total_cost_basis.to_string().parse().unwrap_or(0.0);
        let ug: f64 = ap.unrealized_gains.to_string().parse().unwrap_or(0.0);
        let rg: f64 = ap.realized_gains.to_string().parse().unwrap_or(0.0);
        let fees: f64 = ap.total_fees.to_string().parse().unwrap_or(0.0);
        let value = cb + ug;
        let current_price = if units > 0.0 { value / units } else { 0.0 };

        let asset = asset_map.get(&ap.asset_id.0);

        holdings.push(AccountHoldingItem {
            asset_id: ap.asset_id.0,
            ticker: asset
                .map(|a| a.asset.ticker.as_str().to_string())
                .unwrap_or_default(),
            name: asset
                .map(|a| a.asset.name.as_str().to_string())
                .unwrap_or_default(),
            asset_type_id: asset.map(|a| a.asset.asset_type.0).unwrap_or(0),
            units,
            value,
            cost_basis: cb,
            unrealized_gains: ug,
            realized_gains: rg,
            total_fees: fees,
            current_price,
        });

        total_cost_basis += cb;
        unrealized_gains += ug;
        realized_gains += rg;
        total_fees += fees;

        // Extract open lots (positions where amount_left > 0)
        let lots: Vec<LotItem> = ap
            .positions
            .iter()
            .filter(|p| {
                let left: f64 = p.amount_left.to_string().parse().unwrap_or(0.0);
                left > 0.0
            })
            .map(|p| {
                let left: f64 = p.amount_left.to_string().parse().unwrap_or(0.0);
                let ucb: f64 = p.unit_cost_basis.to_string().parse().unwrap_or(0.0);
                let pug: f64 = p.unrealized_gains.to_string().parse().unwrap_or(0.0);
                let lot_value = left * current_price;
                let lot_cb = left * ucb;
                let gain_pct = if lot_cb != 0.0 {
                    (pug / lot_cb) * 100.0
                } else {
                    0.0
                };
                LotItem {
                    units: left,
                    buy_date: p.add_date.unix_timestamp(),
                    buy_price_per_unit: p.add_price.to_string().parse().unwrap_or(0.0),
                    cost_basis: lot_cb,
                    unrealized_gains: pug,
                    gain_percent: gain_pct,
                    current_value: lot_value,
                }
            })
            .collect();

        if !lots.is_empty() {
            lots_by_asset.insert(ap.asset_id.0, lots);
        }
    }

    holdings.sort_by(|a, b| {
        b.value
            .abs()
            .partial_cmp(&a.value.abs())
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut cash_balance: f64 = 0.0;
    for cp in &resp.portfolios.cash_portfolios {
        let units: f64 = cp.units.to_string().parse().unwrap_or(0.0);
        cash_balance += units;
    }

    let total_value = cash_balance + total_cost_basis + unrealized_gains;

    Ok(AccountOverviewData {
        holdings,
        cash_balance,
        total_value,
        total_cost_basis,
        unrealized_gains,
        realized_gains,
        total_fees,
        lots_by_asset,
    })
}
