use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_type::IdentifiableAssetTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    AssetViewModel = Asset<i32>,
    ExpandedAssetViewModel = Asset<IdentifiableAssetTypeViewModel>
)]
pub struct Asset<T> {
    #[schema(example = "INTC")]
    pub ticker: String,

    #[schema(example = "Intel")]
    pub name: String,
    pub asset_type: T,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    IdentifiableAssetViewModel = IdentifiableAsset<AssetViewModel>,
    IdentifiableExpandedAssetViewModel = IdentifiableAsset<ExpandedAssetViewModel>
)]
pub struct IdentifiableAsset<T> {
    #[schema(example = 1)]
    pub asset_id: i32,

    #[serde(flatten)]
    pub asset: T,
}
