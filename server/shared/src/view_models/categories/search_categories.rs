use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(default)]
pub struct SearchCategoriesQuery {
    /// Filter by category type ID
    pub type_id: Option<i32>,
}
