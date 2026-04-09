use serde::{Deserialize, Serialize};

use super::base_models::{
    asset_id::RequiredAssetId, asset_pair_metadata::AssetPairMetadataViewModel,
    user_asset_pair_metadata::UserAssetPairMetadataViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema, validator::Validate)]
pub struct AddAssetPairRequestViewModel {
    pub reference_id: RequiredAssetId,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddAssetPairResponseViewModel {
    pub main_asset_id: RequiredAssetId,
    pub reference_asset_id: RequiredAssetId,
    pub metadata: Option<AssetPairMetadataViewModel>,
    pub user_metadata: Option<UserAssetPairMetadataViewModel>,
}
