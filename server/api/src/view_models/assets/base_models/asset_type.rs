use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetTypeViewModel {
    /// The name of the asset type
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableAssetTypeViewModel {
    /// The name of the asset type
    #[schema(example = "Stocks")]
    pub name: String,

    #[schema(example = 3)]
    /// The id of the asset type
    pub id: i32,
}
