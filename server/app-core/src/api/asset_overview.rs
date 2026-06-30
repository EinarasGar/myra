use std::collections::HashMap;

use shared::view_models::portfolio::get_overview::GetPortfolioOverviewViewModel;

use crate::models::LotItem;

pub struct AssetOverviewData {
    pub lots: Vec<LotItem>,
    pub ticker: String,
    pub name: String,
    pub units: f64,
    pub value: f64,
    pub cost_basis: f64,
    pub unrealized_gains: f64,
    pub total_fees: f64,
    pub current_price: f64,
}

pub fn extract_asset_overview(body: &str) -> Result<AssetOverviewData, String> {
    let resp: GetPortfolioOverviewViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;

    let account_map: HashMap<String, String> = resp
        .lookup_tables
        .accounts
        .iter()
        .map(|a| {
            (
                a.account_id.0.to_string(),
                a.account.name.as_str().to_string(),
            )
        })
        .collect();

    let asset_map: HashMap<i32, _> = resp
        .lookup_tables
        .assets
        .iter()
        .map(|a| (a.asset_id.0, a))
        .collect();

    let mut total_units: f64 = 0.0;
    let mut total_value: f64 = 0.0;
    let mut total_cost_basis: f64 = 0.0;
    let mut total_unrealized_gains: f64 = 0.0;
    let mut total_fees: f64 = 0.0;
    let mut ticker = String::new();
    let mut name = String::new();
    let mut all_lots: Vec<LotItem> = Vec::new();

    for ap in &resp.portfolios.asset_portfolios {
        let units: f64 = ap.remaining_units.to_string().parse().unwrap_or(0.0);
        let cb: f64 = ap.total_cost_basis.to_string().parse().unwrap_or(0.0);
        let ug: f64 = ap.unrealized_gains.to_string().parse().unwrap_or(0.0);
        let fees: f64 = ap.total_fees.to_string().parse().unwrap_or(0.0);
        let value: f64 = ap.market_value.to_string().parse().unwrap_or(0.0);

        total_units += units;
        total_cost_basis += cb;
        total_unrealized_gains += ug;
        total_fees += fees;
        total_value += value;

        // Capture ticker/name from the first portfolio
        if ticker.is_empty() {
            if let Some(asset) = asset_map.get(&ap.asset_id.0) {
                ticker = asset.asset.ticker.as_str().to_string();
                name = asset.asset.name.as_str().to_string();
            }
        }

        let current_price = if units > 0.0 { value / units } else { 0.0 };

        let acct_id = ap.account_id.0.to_string();
        let acct_name = account_map.get(&acct_id).cloned().unwrap_or_default();

        for p in &ap.positions {
            let left: f64 = p.amount_left.to_string().parse().unwrap_or(0.0);
            let pug: f64 = p.unrealized_gains.to_string().parse().unwrap_or(0.0);
            let remaining_basis = left * p.unit_cost_basis.to_string().parse().unwrap_or(0.0);
            let gain_pct = if remaining_basis != 0.0 {
                (pug / remaining_basis) * 100.0
            } else {
                0.0
            };
            all_lots.push(LotItem {
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
                account_id: acct_id.clone(),
                account_name: acct_name.clone(),
            });
        }
    }

    let current_price = if total_units > 0.0 {
        total_value / total_units
    } else {
        0.0
    };

    all_lots.sort_by(|a, b| b.buy_date.cmp(&a.buy_date));

    Ok(AssetOverviewData {
        lots: all_lots,
        ticker,
        name,
        units: total_units,
        value: total_value,
        cost_basis: total_cost_basis,
        unrealized_gains: total_unrealized_gains,
        total_fees,
        current_price,
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
                    "asset_id": 42,
                    "account_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "positions": [
                        {
                            "add_price": 100.0, "quantity_added": 10,
                            "add_date": "2023-01-15T12:00:00Z",
                            "fees": 0, "amount_sold": 0, "sale_proceeds": 0,
                            "is_dividend": false,
                            "unit_cost_basis": 100.0, "total_cost_basis": 1000.0,
                            "realized_gains": 0, "unrealized_gains": 200.0,
                            "total_gains": 200.0, "amount_left": 10
                        }
                    ],
                    "cash_dividends": 0, "total_units": 10, "total_fees": 10,
                    "realized_gains": 0, "unrealized_gains": 200.0,
                    "total_gains": 200.0, "total_cost_basis": 1000.0,
                    "unit_cost_basis": 100.0, "remaining_units": 10,
                    "market_value": 1200.0
                },
                {
                    "asset_id": 42,
                    "account_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "positions": [
                        {
                            "add_price": 110.0, "quantity_added": 5,
                            "add_date": "2023-06-20T12:00:00Z",
                            "fees": 0, "amount_sold": 1, "sale_proceeds": 115,
                            "is_dividend": false,
                            "unit_cost_basis": 110.0, "total_cost_basis": 550.0,
                            "realized_gains": 5, "unrealized_gains": 90.0,
                            "total_gains": 95.0, "amount_left": 4
                        }
                    ],
                    "cash_dividends": 0, "total_units": 5, "total_fees": 5,
                    "realized_gains": 5, "unrealized_gains": 90.0,
                    "total_gains": 95.0, "total_cost_basis": 550.0,
                    "unit_cost_basis": 110.0, "remaining_units": 4,
                    "market_value": 480.0
                }
            ]
        },
        "lookup_tables": {
            "accounts": [
                {
                    "account_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "name": "Brokerage A",
                    "account_type": 1
                },
                {
                    "account_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "name": "Brokerage B",
                    "account_type": 1
                }
            ],
            "assets": [
                {
                    "asset_id": 42,
                    "name": "Test Stock",
                    "ticker": "TEST",
                    "asset_type": 1
                }
            ]
        }
    }"#;

    #[test]
    fn aggregates_two_portfolios_and_tags_lots_with_account() {
        let data = extract_asset_overview(OVERVIEW_JSON).unwrap();

        // Header fields are sum of both portfolios
        assert!((data.units - 14.0).abs() < 1e-9);
        assert!((data.value - 1680.0).abs() < 1e-9);
        assert!((data.cost_basis - 1550.0).abs() < 1e-9);
        assert!((data.unrealized_gains - 290.0).abs() < 1e-9);
        assert!((data.total_fees - 15.0).abs() < 1e-9);
        assert_eq!(data.ticker, "TEST");
        assert_eq!(data.name, "Test Stock");

        // Lots from both portfolios, sorted desc by buy_date (newest first)
        assert_eq!(data.lots.len(), 2);
        // 2023-06-20 > 2023-01-15 so first
        assert_eq!(data.lots[0].buy_date, 1687262400);

        // Account fields populated
        assert_eq!(
            data.lots[0].account_id,
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        );
        assert_eq!(data.lots[0].account_name, "Brokerage B");
        assert_eq!(
            data.lots[1].account_id,
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        );
        assert_eq!(data.lots[1].account_name, "Brokerage A");
    }
}
