use business::dtos::asset_dto::AssetDto;
use serde::{Deserialize, Serialize};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetViewModel {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub id: i32,
}

impl From<AssetDto> for AssetViewModel {
    fn from(p: AssetDto) -> Self {
        Self {
            ticker: p.ticker,
            name: p.name,
            category: p.category,
            id: p.asset_id,
        }
    }
}
