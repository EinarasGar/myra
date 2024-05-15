use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{asset::ExpandedAssetViewModel, asset_metadata::AssetMetadataViewModel};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAssetResponseViewModel {
    #[serde(flatten)]
    pub asset: ExpandedAssetViewModel,

    #[serde(flatten)]
    pub metadata: AssetMetadataViewModel,
}
