use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_id::RequiredAssetId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetMetadataViewModel {
    /// Id of the asset paired to this asset by default.
    #[schema(example = 2)]
    pub base_asset_id: RequiredAssetId,

    /// Ids of available second assets paired to this asset.
    #[schema(example = json!(vec![2,4]))]
    pub pairs: Vec<RequiredAssetId>,
}
