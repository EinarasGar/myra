use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredCategoryTypeId(pub i32);

impl From<i32> for RequiredCategoryTypeId {
    fn from(id: i32) -> Self {
        RequiredCategoryTypeId(id)
    }
}
