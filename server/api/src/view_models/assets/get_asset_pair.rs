use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    asset::ExpandedAssetViewModel, shared_asset_pair_metadata::SharedAssetPairMetadataViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAssetPairResponseViewModel {
    pub main_asset: ExpandedAssetViewModel,
    pub reference_asset: ExpandedAssetViewModel,
    pub metadata: SharedAssetPairMetadataViewModel,
}
