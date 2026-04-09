use super::base_models::category_type::IdentifiableCategoryTypeViewModel;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetCategoryTypesResponseViewModel {
    pub category_types: Vec<IdentifiableCategoryTypeViewModel>,
}
