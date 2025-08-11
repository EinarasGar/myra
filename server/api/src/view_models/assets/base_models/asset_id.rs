use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredAssetId(pub i32);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetId(pub Option<i32>);