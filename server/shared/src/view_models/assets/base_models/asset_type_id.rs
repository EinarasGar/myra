use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredAssetTypeId(pub i32);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetTypeId(pub Option<i32>);
