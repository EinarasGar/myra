use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredCategoryId(pub i32);

impl From<i32> for RequiredCategoryId {
    fn from(id: i32) -> Self {
        RequiredCategoryId(id)
    }
}
