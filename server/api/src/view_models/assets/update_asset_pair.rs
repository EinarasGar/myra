use serde::{Deserialize, Serialize};

use super::base_models::user_asset_pair_metadata::UserAssetPairMetadataViewModel;

use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAssetPairRequestViewModel {
    #[serde(flatten)]
    pub metadata: UserAssetPairMetadataViewModel,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAssetPairResponseViewModel {
    #[serde(flatten)]
    pub metadata: UserAssetPairMetadataViewModel,
}
