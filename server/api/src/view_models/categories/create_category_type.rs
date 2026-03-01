use super::base_models::category_type::IdentifiableCategoryTypeViewModel;
use crate::view_models::categories::base_models::category_type_name::CategoryTypeName;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCategoryTypeRequestViewModel {
    #[schema(example = "Custom Expense")]
    pub name: CategoryTypeName,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCategoryTypeResponseViewModel {
    #[serde(flatten)]
    pub category_type: IdentifiableCategoryTypeViewModel,
}

impl From<CreateCategoryTypeRequestViewModel>
    for business::dtos::categories::CreateCategoryTypeDto
{
    fn from(request: CreateCategoryTypeRequestViewModel) -> Self {
        Self {
            category_type_name: request.name.into_inner(),
        }
    }
}
