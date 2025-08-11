use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredCategoryId(pub i32);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CategoryId(pub Option<i32>);