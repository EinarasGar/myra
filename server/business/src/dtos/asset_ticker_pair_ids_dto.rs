use dal::models::asset_models::AssetRaw;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetTickerPairIdsDto {
    pub ticker: String,
    pub asset_id: i32,
    pub asset_type: i32,
    pub base_id: Option<i32>,
}

impl From<AssetRaw> for AssetTickerPairIdsDto {
    fn from(p: AssetRaw) -> Self {
        Self {
            ticker: p.ticker,
            asset_id: p.id,
            asset_type: p.asset_type,
            base_id: p.base_pair_id,
        }
    }
}
