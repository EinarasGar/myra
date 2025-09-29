use super::base_models::category_type::IdentifiableCategoryTypeViewModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetCategoryTypesResponseViewModel {
    pub category_types: Vec<IdentifiableCategoryTypeViewModel>,
}
