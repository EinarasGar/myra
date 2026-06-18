use std::collections::HashMap;

use shared::view_models::portfolio::get_overview::GetPortfolioOverviewViewModel;

use crate::models::{AccountHoldingItem, LotItem};

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
    let mut total_market_value: f64 = 0.0;
    let mut total_cost_basis: f64 = 0.0;
    let mut unrealized_gains: f64 = 0.0;
    let mut realized_gains: f64 = 0.0;
    let mut total_fees: f64 = 0.0;

    for ap in &resp.portfolios.asset_portfolios {
        let units: f64 = ap.remaining_units.to_string().parse().unwrap_or(0.0);
        let cb: f64 = ap.total_cost_basis.to_string().parse().unwrap_or(0.0);
        let ug: f64 = ap.unrealized_gains.to_string().parse().unwrap_or(0.0);
        let rg: f64 = ap.realized_gains.to_string().parse().unwrap_or(0.0);
        let fees: f64 = ap.total_fees.to_string().parse().unwrap_or(0.0);
        let value: f64 = ap.market_value.to_string().parse().unwrap_or(0.0);
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

        total_market_value += value;
        total_cost_basis += cb;
        unrealized_gains += ug;
        realized_gains += rg;
        total_fees += fees;

        let mut lots: Vec<LotItem> = ap
            .positions
            .iter()
            .map(|p| {
                let left: f64 = p.amount_left.to_string().parse().unwrap_or(0.0);
                let ucb: f64 = p.unit_cost_basis.to_string().parse().unwrap_or(0.0);
                let pug: f64 = p.unrealized_gains.to_string().parse().unwrap_or(0.0);
                let remaining_basis = left * ucb;
                let gain_pct = if remaining_basis != 0.0 {
                    (pug / remaining_basis) * 100.0
                } else {
                    0.0
                };
                LotItem {
                    units_bought: p.quantity_added.to_string().parse().unwrap_or(0.0),
                    units_remaining: left,
                    units_sold: p.amount_sold.to_string().parse().unwrap_or(0.0),
                    buy_date: p.add_date.unix_timestamp(),
                    buy_price_per_unit: p.add_price.to_string().parse().unwrap_or(0.0),
                    cost_basis: p.total_cost_basis.to_string().parse().unwrap_or(0.0),
                    realized_gains: p.realized_gains.to_string().parse().unwrap_or(0.0),
                    unrealized_gains: pug,
                    gain_percent: gain_pct,
                    current_value: left * current_price,
                }
            })
            .collect();

        lots.sort_by(|a, b| b.buy_date.cmp(&a.buy_date));

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

    let total_value = cash_balance + total_market_value;

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

#[cfg(test)]
mod tests {
    use super::*;

    const OVERVIEW_JSON: &str = r#"{
        "portfolios": {
            "cash_portfolios": [],
            "asset_portfolios": [
                {
                    "asset_id": 190457,
                    "account_id": "00000000-0000-0000-0000-000000000000",
                    "positions": [
                        {
                            "add_price": 280.91, "quantity_added": 3,
                            "add_date": "2020-11-10T12:00:00Z",
                            "fees": 0, "amount_sold": 3, "sale_proceeds": 700.07,
                            "is_dividend": false,
                            "unit_cost_basis": 280.91, "total_cost_basis": 842.73,
                            "realized_gains": 700.07, "unrealized_gains": 0,
                            "total_gains": 700.07, "amount_left": 0
                        },
                        {
                            "add_price": 277.90, "quantity_added": 5,
                            "add_date": "2020-12-21T12:00:00Z",
                            "fees": 0, "amount_sold": 1, "sale_proceeds": 313,
                            "is_dividend": false,
                            "unit_cost_basis": 277.90, "total_cost_basis": 1389.48,
                            "realized_gains": 35, "unrealized_gains": 1268.41,
                            "total_gains": 1303.41, "amount_left": 4
                        }
                    ],
                    "cash_dividends": 0, "total_units": 8, "total_fees": 0,
                    "realized_gains": 735.07, "unrealized_gains": 1268.41,
                    "total_gains": 2003.48, "total_cost_basis": 2232.21,
                    "unit_cost_basis": 279.03, "remaining_units": 4,
                    "market_value": 2379.99
                }
            ]
        },
        "lookup_tables": { "accounts": [], "assets": [] }
    }"#;

    #[test]
    fn lots_include_sold_and_carry_realized_and_bought_fields() {
        let data = extract_account_overview(OVERVIEW_JSON).unwrap();
        let lots = data.lots_by_asset.get(&190457).expect("asset has lots");

        assert_eq!(lots.len(), 2);
        assert_eq!(lots[0].units_bought, 5.0);
        assert_eq!(lots[1].units_bought, 3.0);

        let open = &lots[0];
        assert_eq!(open.units_remaining, 4.0);
        assert_eq!(open.units_sold, 1.0);
        assert_eq!(open.realized_gains, 35.0);
        assert!((open.cost_basis - 1389.48).abs() < 1e-6);
        assert!((open.unrealized_gains - 1268.41).abs() < 1e-6);
        assert!((open.current_value - 2379.99).abs() < 1e-6);
        assert!((open.gain_percent - 114.1).abs() < 0.1);

        let closed = &lots[1];
        assert_eq!(closed.units_remaining, 0.0);
        assert_eq!(closed.units_sold, 3.0);
        assert!((closed.realized_gains - 700.07).abs() < 1e-6);
        assert_eq!(closed.unrealized_gains, 0.0);
        assert_eq!(closed.current_value, 0.0);
        assert_eq!(closed.gain_percent, 0.0);
    }
}
