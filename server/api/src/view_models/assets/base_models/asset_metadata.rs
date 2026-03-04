use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_id::RequiredAssetId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetPairInfoViewModel {
    pub asset_id: RequiredAssetId,
    pub ticker: String,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetMetadataViewModel {
    /// The asset paired to this asset by default, with resolved ticker and name.
    pub base_asset: AssetPairInfoViewModel,

    /// Available pairs with resolved ticker and name info.
    pub pairs: Vec<AssetPairInfoViewModel>,
}
