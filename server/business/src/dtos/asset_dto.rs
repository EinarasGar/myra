use dal::models::asset_models::{Asset, PublicAsset};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetDto {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub asset_id: i32,
    pub owner: Option<Uuid>,
}

impl From<Asset> for AssetDto {
    fn from(p: Asset) -> Self {
        Self {
            ticker: p.ticker,
            name: p.asset_name,
            category: "obselete dto".to_string(),
            asset_id: p.id,
            owner: p.user_id,
        }
    }
}

impl From<PublicAsset> for AssetDto {
    fn from(p: PublicAsset) -> Self {
        Self {
            ticker: p.ticker,
            name: p.asset_name,
            category: p.category,
            asset_id: p.id,
            owner: None,
        }
    }
}
