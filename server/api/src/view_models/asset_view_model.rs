use business::dtos::asset_dto::AssetDto;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetRespData {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub asset_id: i32,
}

impl From<AssetDto> for AssetRespData {
    fn from(p: AssetDto) -> Self {
        Self {
            ticker: p.ticker,
            name: p.name,
            category: p.category,
            asset_id: p.asset_id,
        }
    }
}
