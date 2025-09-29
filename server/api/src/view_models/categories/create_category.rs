use crate::view_models::categories::base_models::category_type_id::RequiredCategoryTypeId;

use super::base_models::category::IdentifiableExpandedCategoryViewModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Validate)]
pub struct CreateCategoryRequestViewModel {
    #[validate(length(min = 1, max = 100))]
    #[schema(example = "Groceries")]
    pub category: String,

    // TODO: Add icon validation once icon list is defined
    #[validate(length(min = 1, max = 50))]
    #[schema(example = "shopping-cart")]
    pub icon: String,

    #[schema(example = 1)]
    pub category_type_id: RequiredCategoryTypeId,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCategoryResponseViewModel {
    #[serde(flatten)]
    pub category: IdentifiableExpandedCategoryViewModel,
}

impl From<CreateCategoryRequestViewModel> for business::dtos::categories::CreateCategoryDto {
    fn from(request: CreateCategoryRequestViewModel) -> Self {
        Self {
            category: request.category,
            icon: request.icon,
            category_type: request.category_type_id.0,
        }
    }
}
