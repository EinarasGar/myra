use serde::{Deserialize, Serialize};
use utoipa::IntoParams;

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams)]
#[serde(default)]
pub struct SearchCategoriesQuery {
    /// Filter by category type ID
    pub type_id: Option<i32>,
}

impl Default for SearchCategoriesQuery {
    fn default() -> Self {
        Self { type_id: None }
    }
}
