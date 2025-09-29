use super::base_models::category_type::IdentifiableCategoryTypeViewModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Validate)]
pub struct CreateCategoryTypeRequestViewModel {
    #[validate(length(min = 1, max = 50))]
    #[schema(example = "Custom Expense")]
    pub name: String,
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
            category_type_name: request.name,
        }
    }
}
