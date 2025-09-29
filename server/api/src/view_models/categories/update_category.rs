use super::base_models::category::ExpandedCategoryViewModel;
use super::base_models::category_type_id::RequiredCategoryTypeId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Validate)]
pub struct UpdateCategoryRequestViewModel {
    /// Category name
    #[validate(length(min = 1, max = 100))]
    #[schema(example = "Updated Category Name")]
    pub category: String,

    /// Icon identifier
    #[validate(length(min = 1, max = 50))]
    #[schema(example = "updated-icon")]
    pub icon: String,

    /// Category type ID
    #[schema(example = 1)]
    pub category_type_id: RequiredCategoryTypeId,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateCategoryResponseViewModel {
    #[serde(flatten)]
    pub category: ExpandedCategoryViewModel,
}

impl From<UpdateCategoryRequestViewModel> for business::dtos::categories::UpdateCategoryDto {
    fn from(request: UpdateCategoryRequestViewModel) -> Self {
        Self {
            category: request.category,
            icon: request.icon,
            category_type: request.category_type_id.0,
        }
    }
}
