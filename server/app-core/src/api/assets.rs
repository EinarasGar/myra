use shared::view_models::base_models::search::AssetsPage;

use crate::models::AssetItem;

pub fn extract_assets(body: &str) -> Result<Vec<AssetItem>, String> {
    let page: AssetsPage = serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(page
        .results
        .into_iter()
        .map(|row| AssetItem {
            id: row.asset.asset_id.0,
            name: row.asset.asset.name.into_inner(),
            ticker: row.asset.asset.ticker.into_inner(),
        })
        .collect())
}
