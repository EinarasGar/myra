use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredLiquidityTypeId(pub i32);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct LiquidityTypeId(pub Option<i32>);
