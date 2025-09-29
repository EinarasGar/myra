use super::base_models::category_type::CategoryTypeViewModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Validate)]
pub struct UpdateCategoryTypeRequestViewModel {
    /// Category type name
    #[validate(length(min = 1, max = 50))]
    #[schema(example = "Updated Type Name")]
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateCategoryTypeResponseViewModel {
    #[serde(flatten)]
    pub category_type: CategoryTypeViewModel,
}

impl From<UpdateCategoryTypeRequestViewModel>
    for business::dtos::categories::UpdateCategoryTypeDto
{
    fn from(request: UpdateCategoryTypeRequestViewModel) -> Self {
        Self {
            category_type_name: request.name,
        }
    }
}
