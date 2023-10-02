use dal::models::asset_models::InsertAsset;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InsertAssetDto {
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub base_pair_id: Option<i32>,
}

impl From<InsertAssetDto> for InsertAsset {
    fn from(p: InsertAssetDto) -> Self {
        Self {
            ticker: p.ticker,
            name: p.name,
            asset_type: p.asset_type,
            base_pair_id: p.base_pair_id,
        }
    }
}
