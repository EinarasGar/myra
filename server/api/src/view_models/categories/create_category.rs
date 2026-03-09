use crate::view_models::categories::base_models::category_name::CategoryName;
use crate::view_models::categories::base_models::category_type_id::RequiredCategoryTypeId;
use crate::view_models::categories::base_models::icon_name::IconName;

use super::base_models::category::IdentifiableExpandedCategoryViewModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCategoryRequestViewModel {
    #[schema(example = "Groceries")]
    pub category: CategoryName,

    // TODO: Add icon validation once icon list is defined
    #[schema(example = "shopping-cart")]
    pub icon: IconName,

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
            category: request.category.into_inner(),
            icon: request.icon.into_inner(),
            category_type: request.category_type_id.0,
        }
    }
}
