use dal::models::asset_models::InsertAsset;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetInsertDto {
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub base_pair_id: Option<i32>,
    pub user_id: Option<Uuid>,
}

impl From<AssetInsertDto> for InsertAsset {
    fn from(p: AssetInsertDto) -> Self {
        Self {
            ticker: p.ticker,
            name: p.name,
            asset_type: p.asset_type,
            base_pair_id: p.base_pair_id,
            user_id: p.user_id,
        }
    }
}
