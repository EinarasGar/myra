use serde::{Deserialize, Serialize};

use super::base_models::asset::{AssetViewModel, IdentifiableAssetViewModel};
use super::base_models::asset_id::RequiredAssetId;

use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetRequestViewModel {
    #[serde(flatten)]
    pub asset: AssetViewModel,

    /// The id of an asset to which this asset is usually exchanged to.
    pub base_asset_id: RequiredAssetId,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetResponseViewModel {
    #[serde(flatten)]
    pub asset: IdentifiableAssetViewModel,

    /// The id of an asset to which this asset is usually exchanged to.
    pub base_asset_id: RequiredAssetId,
}
