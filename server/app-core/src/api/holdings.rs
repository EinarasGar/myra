use std::collections::HashMap;

use shared::view_models::portfolio::get_holdings::GetHoldingsResponseViewModel;

use crate::models::HoldingItem;

pub fn extract_holdings(body: &str) -> Result<Vec<HoldingItem>, String> {
    let resp: GetHoldingsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;

    let mut aggregated: HashMap<i32, (f64, f64)> = HashMap::new();
    for row in &resp.holdings {
        let units: f64 = row.units.to_string().parse().unwrap_or(0.0);
        let value: f64 = row
            .value
            .as_ref()
            .map(|v| v.to_string().parse().unwrap_or(0.0))
            .unwrap_or(0.0);
        let entry = aggregated.entry(row.asset_id.0).or_insert((0.0, 0.0));
        entry.0 += units;
        entry.1 += value;
    }

    let asset_map: HashMap<i32, _> = resp
        .lookup_tables
        .assets
        .iter()
        .map(|a| (a.asset_id.0, a))
        .collect();

    let mut items: Vec<HoldingItem> = aggregated
        .into_iter()
        .map(|(asset_id, (units, value))| {
            let asset = asset_map.get(&asset_id);
            HoldingItem {
                asset_name: asset
                    .map(|a| a.asset.name.as_str().to_string())
                    .unwrap_or_default(),
                ticker: asset
                    .map(|a| a.asset.ticker.as_str().to_string())
                    .unwrap_or_default(),
                units,
                value,
                asset_type_id: asset.map(|a| a.asset.asset_type.0).unwrap_or(0),
                asset_id,
            }
        })
        .collect();

    items.sort_by(|a, b| {
        b.value
            .abs()
            .partial_cmp(&a.value.abs())
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(items)
}

pub fn extract_account_balances(body: &str) -> Result<HashMap<String, f64>, String> {
    let resp: GetHoldingsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;

    let mut balances: HashMap<String, f64> = HashMap::new();
    for row in &resp.holdings {
        let value: f64 = row
            .value
            .as_ref()
            .map(|v| v.to_string().parse().unwrap_or(0.0))
            .unwrap_or(0.0);
        *balances.entry(row.account_id.0.to_string()).or_insert(0.0) += value;
    }

    Ok(balances)
}

#[cfg(test)]
mod tests {
    use super::*;

    const HOLDINGS_JSON: &str = r#"{
        "holdings": [
            { "account_id": "00000000-0000-0000-0000-000000000001", "asset_id": 42, "units": "100", "value": "87.0" },
            { "account_id": "00000000-0000-0000-0000-000000000001", "asset_id": 45, "units": "10", "value": "10.0" },
            { "account_id": "00000000-0000-0000-0000-000000000002", "asset_id": 45, "units": "-50", "value": "-50.0" },
            { "account_id": "00000000-0000-0000-0000-000000000003", "asset_id": 99, "units": "5", "value": null }
        ],
        "lookup_tables": { "accounts": [], "assets": [] }
    }"#;

    #[test]
    fn account_balances_sum_value_per_account_and_treat_null_as_zero() {
        let balances = extract_account_balances(HOLDINGS_JSON).unwrap();
        assert!((balances["00000000-0000-0000-0000-000000000001"] - 97.0).abs() < 1e-9);
        assert!((balances["00000000-0000-0000-0000-000000000002"] - (-50.0)).abs() < 1e-9);
        assert!((balances["00000000-0000-0000-0000-000000000003"]).abs() < 1e-9);
    }
}
