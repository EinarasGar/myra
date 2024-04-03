use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    asset::IdentifiableAssetViewModel, asset_metadata::AssetMetadataViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAssetsLineResponseViewModel {
    #[serde(flatten)]
    pub asset: IdentifiableAssetViewModel,

    #[serde(flatten)]
    pub metadata: AssetMetadataViewModel,
}
