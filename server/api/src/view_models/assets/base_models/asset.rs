use business::dtos::assets::asset_dto::AssetDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_type::IdentifiableAssetTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    AssetViewModel = Asset<i32>,
    ExpandedAssetViewModel = Asset<IdentifiableAssetTypeViewModel>
)]
pub struct Asset<T> {
    #[schema(example = "INTC")]
    pub ticker: String,

    #[schema(example = "Intel")]
    pub name: String,
    pub asset_type: T,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    IdentifiableAssetViewModel = IdentifiableAsset<AssetViewModel>,
    IdentifiableExpandedAssetViewModel = IdentifiableAsset<ExpandedAssetViewModel>
)]
pub struct IdentifiableAsset<T> {
    #[schema(example = 1)]
    pub asset_id: i32,

    #[serde(flatten)]
    pub asset: T,
}

impl From<AssetDto> for ExpandedAssetViewModel {
    fn from(value: AssetDto) -> Self {
        Self {
            ticker: value.ticker,
            name: value.name,
            asset_type: value.asset_type.into(),
        }
    }
}

impl From<AssetDto> for AssetViewModel {
    fn from(value: AssetDto) -> Self {
        Self {
            ticker: value.ticker,
            name: value.name,
            asset_type: value.asset_type.id,
        }
    }
}

impl From<AssetDto> for IdentifiableAssetViewModel {
    fn from(value: AssetDto) -> Self {
        Self {
            asset_id: value.id.0,
            asset: value.into(),
        }
    }
}
