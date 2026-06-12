use serde::{Deserialize, Serialize};

use super::asset_id::RequiredAssetId;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AssetPairInfoViewModel {
    pub asset_id: RequiredAssetId,
    pub ticker: String,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AssetMetadataViewModel {
    /// The asset paired to this asset by default, with resolved ticker and name.
    /// Absent for assets that have no designated base pair (e.g. currencies).
    pub base_asset: Option<AssetPairInfoViewModel>,

    /// Available pairs with resolved ticker and name info.
    pub pairs: Vec<AssetPairInfoViewModel>,
}
