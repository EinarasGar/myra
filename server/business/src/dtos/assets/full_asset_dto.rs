use dal::models::asset_models::AssetWithMetadata;

use super::{asset_dto::AssetDto, asset_type_dto::AssetTypeDto};

pub struct FullAssetDto {
    pub asset: AssetDto,
    pub base_asset_id: i32,
    pub pairs: Option<Vec<i32>>,
}

impl From<AssetWithMetadata> for FullAssetDto {
    fn from(p: AssetWithMetadata) -> Self {
        Self {
            asset: AssetDto {
                asset_type: AssetTypeDto {
                    name: p.asset_type_name,
                    id: p.asset_type,
                },
                name: p.asset_name,
                ticker: p.ticker,
                id: p.id,
            },
            base_asset_id: p.base_pair_id,
            pairs: p.pairs,
        }
    }
}
