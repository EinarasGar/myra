use super::base_models::category::ExpandedCategoryViewModel;
use super::base_models::category_type_id::RequiredCategoryTypeId;
use crate::view_models::categories::base_models::category_name::CategoryName;
use crate::view_models::categories::base_models::icon_name::IconName;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateCategoryRequestViewModel {
    /// Category name
    #[schema(example = "Updated Category Name")]
    pub category: CategoryName,

    /// Icon identifier
    #[schema(example = "updated-icon")]
    pub icon: IconName,

    /// Category type ID
    #[schema(example = 1)]
    pub category_type_id: RequiredCategoryTypeId,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateCategoryResponseViewModel {
    #[serde(flatten)]
    pub category: ExpandedCategoryViewModel,
}

#[cfg(feature = "backend")]
impl From<UpdateCategoryRequestViewModel> for business::dtos::categories::UpdateCategoryDto {
    fn from(request: UpdateCategoryRequestViewModel) -> Self {
        Self {
            category: request.category.into_inner(),
            icon: request.icon.into_inner(),
            category_type: request.category_type_id.0,
        }
    }
}
