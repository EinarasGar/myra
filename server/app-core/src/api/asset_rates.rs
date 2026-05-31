use shared::view_models::assets::get_asset_pair_rates::GetAssetPairRatesResponseViewModel;

use crate::models::ChartPoint;

pub fn extract_asset_rates(body: &str) -> Result<Vec<ChartPoint>, String> {
    let resp: GetAssetPairRatesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;

    let points: Vec<ChartPoint> = resp
        .rates
        .into_iter()
        .map(|r| ChartPoint {
            timestamp: r.date.unix_timestamp(),
            value: r.rate.to_f64(),
        })
        .collect();

    Ok(points)
}
