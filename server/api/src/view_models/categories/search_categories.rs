use serde::{Deserialize, Serialize};
use utoipa::IntoParams;

#[derive(Clone, Debug, Default, Serialize, Deserialize, IntoParams)]
#[serde(default)]
pub struct SearchCategoriesQuery {
    /// Filter by category type ID
    pub type_id: Option<i32>,
}
