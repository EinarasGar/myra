use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    asset::IdentifiableExpandedAssetViewModel, asset_metadata::AssetMetadataViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAssetResponseViewModel {
    #[serde(flatten)]
    pub asset: IdentifiableExpandedAssetViewModel,

    #[serde(flatten)]
    pub metadata: AssetMetadataViewModel,
}
