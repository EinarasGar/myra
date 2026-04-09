use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct RequiredCategoryId(pub i32);

impl From<i32> for RequiredCategoryId {
    fn from(id: i32) -> Self {
        RequiredCategoryId(id)
    }
}
