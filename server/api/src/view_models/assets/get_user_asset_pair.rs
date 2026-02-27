use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    asset::ExpandedAssetViewModel, asset_pair_metadata::AssetPairMetadataViewModel,
    user_asset_pair_metadata::UserAssetPairMetadataViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]

pub struct GetUserAssetPairResponseViewModel {
    pub main_asset: ExpandedAssetViewModel,
    pub reference_asset: ExpandedAssetViewModel,
    pub metadata: Option<AssetPairMetadataViewModel>,
    pub user_metadata: Option<UserAssetPairMetadataViewModel>,
}
