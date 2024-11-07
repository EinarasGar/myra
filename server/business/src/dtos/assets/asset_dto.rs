use dal::models::asset_models::Asset;

use super::asset_type_dto::AssetTypeDto;

pub struct AssetDto {
    pub asset_type: AssetTypeDto,
    pub name: String,
    pub ticker: String,
    pub id: i32,
}

impl From<Asset> for AssetDto {
    fn from(p: Asset) -> Self {
        Self {
            asset_type: AssetTypeDto {
                name: p.asset_type_name,
                id: p.asset_type,
            },
            name: p.asset_name,
            ticker: p.ticker,
            id: p.id,
        }
    }
}
