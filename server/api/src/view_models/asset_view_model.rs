use business::dtos::asset_dto::AssetDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "ticker": "EUR",
    "Name": "Euro",
    "Category": "Currencies",
    "id": 1
}))]
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
