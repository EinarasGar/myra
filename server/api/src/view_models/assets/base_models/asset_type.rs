use business::dtos::assets::asset_type_dto::AssetTypeDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_type_id::RequiredAssetTypeId;

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetTypeViewModel {
    /// The name of the asset type
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableAssetTypeViewModel {
    /// The name of the asset type
    #[schema(example = "Stocks")]
    pub name: String,

    #[schema(example = 3)]
    /// The id of the asset type
    pub id: RequiredAssetTypeId,
}

impl From<AssetTypeDto> for AssetTypeViewModel {
    fn from(p: AssetTypeDto) -> Self {
        Self { name: p.name }
    }
}

impl From<AssetTypeDto> for IdentifiableAssetTypeViewModel {
    fn from(p: AssetTypeDto) -> Self {
        Self {
            name: p.name,
            id: RequiredAssetTypeId(p.id),
        }
    }
}
