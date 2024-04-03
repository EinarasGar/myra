use serde::{Deserialize, Serialize};

use super::base_models::asset::AssetViewModel;

use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAssetRequestViewModel {
    #[serde(flatten)]
    pub asset: AssetViewModel,
    pub base_asset_id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAssetResponseViewModel {
    #[serde(flatten)]
    pub asset: AssetViewModel,
    pub base_asset_id: i32,
}
