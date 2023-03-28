use dal::models::assets::Asset;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetDto {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub asset_id: i32,
}

impl From<Asset> for AssetDto {
    fn from(p: Asset) -> Self {
        Self {
            ticker: p.ticker,
            name: p.name,
            category: p.category,
            asset_id: p.id,
        }
    }
}
