use serde::{Deserialize, Serialize};

use super::base_models::asset_pair_metadata::AssetPairMetadataViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetConvertedAssetPairResponseViewModel {
    #[serde(flatten)]
    pub metadata: Option<AssetPairMetadataViewModel>,
}
