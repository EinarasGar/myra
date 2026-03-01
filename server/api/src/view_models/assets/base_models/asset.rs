use business::dtos::assets::asset_dto::AssetDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_id::RequiredAssetId;
use super::asset_type::IdentifiableAssetTypeViewModel;
use super::asset_type_id::RequiredAssetTypeId;
use super::asset_name::AssetName;
use super::asset_ticker::AssetTicker;

pub type AssetViewModel = Asset<RequiredAssetTypeId>;
pub type ExpandedAssetViewModel = Asset<IdentifiableAssetTypeViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct Asset<T> {
    /// Short letter abbreviation of the asset
    #[schema(example = "INTC")]
    pub ticker: AssetTicker,

    /// Full name of the asset
    #[schema(example = "Intel")]
    pub name: AssetName,

    #[schema(inline = false)]
    pub asset_type: T,
}

pub type IdentifiableAssetViewModel = IdentifiableAsset<AssetViewModel>;
#[allow(dead_code)]
pub type IdentifiableExpandedAssetViewModel = IdentifiableAsset<ExpandedAssetViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableAsset<T> {
    #[schema(example = 1)]
    pub asset_id: RequiredAssetId,

    #[serde(flatten)]
    pub asset: T,
}

impl From<AssetDto> for ExpandedAssetViewModel {
    fn from(value: AssetDto) -> Self {
        Self {
            ticker: AssetTicker::from_trusted(value.ticker),
            name: AssetName::from_trusted(value.name),
            asset_type: value.asset_type.into(),
        }
    }
}

impl From<AssetDto> for AssetViewModel {
    fn from(value: AssetDto) -> Self {
        Self {
            ticker: AssetTicker::from_trusted(value.ticker),
            name: AssetName::from_trusted(value.name),
            asset_type: RequiredAssetTypeId(value.asset_type.id),
        }
    }
}

impl From<AssetDto> for IdentifiableAssetViewModel {
    fn from(value: AssetDto) -> Self {
        Self {
            asset_id: RequiredAssetId(value.id.0),
            asset: value.into(),
        }
    }
}
