use dal::models::asset_models::AssetWithMetadata;

use super::{asset_dto::AssetDto, asset_id_dto::AssetIdDto, asset_type_dto::AssetTypeDto};

pub struct FullAssetDto {
    pub asset: AssetDto,
    pub base_asset_id: AssetIdDto,
    pub pairs: Option<Vec<AssetIdDto>>,
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
                id: AssetIdDto(p.id),
            },
            base_asset_id: AssetIdDto(p.base_pair_id),
            pairs: p.pairs.map(|x| x.into_iter().map(AssetIdDto).collect()),
        }
    }
}
