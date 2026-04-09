use serde::{Deserialize, Serialize};

use super::base_models::{
    asset::ExpandedAssetViewModel, shared_asset_pair_metadata::SharedAssetPairMetadataViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetAssetPairResponseViewModel {
    pub main_asset: ExpandedAssetViewModel,
    pub reference_asset: ExpandedAssetViewModel,
    pub metadata: SharedAssetPairMetadataViewModel,
}
