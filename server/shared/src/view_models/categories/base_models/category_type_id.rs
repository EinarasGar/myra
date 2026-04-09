use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct RequiredCategoryTypeId(pub i32);

impl From<i32> for RequiredCategoryTypeId {
    fn from(id: i32) -> Self {
        RequiredCategoryTypeId(id)
    }
}
