use serde::{Deserialize, Serialize};

use super::base_models::asset::AssetViewModel;
use super::base_models::asset_id::RequiredAssetId;

use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAssetRequestViewModel {
    #[serde(flatten)]
    pub asset: AssetViewModel,
    pub base_asset_id: RequiredAssetId,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAssetResponseViewModel {
    #[serde(flatten)]
    pub asset: AssetViewModel,
    pub base_asset_id: RequiredAssetId,
}
