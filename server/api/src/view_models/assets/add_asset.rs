use serde::{Deserialize, Serialize};

use super::base_models::asset::{AssetViewModel, IdentifiableAssetViewModel};

use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetRequestViewModel {
    #[serde(flatten)]
    pub asset: AssetViewModel,
    pub base_asset_id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetResponseViewModel {
    #[serde(flatten)]
    pub asset: IdentifiableAssetViewModel,
    pub base_asset_id: i32,
}
