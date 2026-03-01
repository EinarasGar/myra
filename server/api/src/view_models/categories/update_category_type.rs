use super::base_models::category_type::CategoryTypeViewModel;
use crate::view_models::categories::base_models::category_type_name::CategoryTypeName;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateCategoryTypeRequestViewModel {
    /// Category type name
    #[schema(example = "Updated Type Name")]
    pub name: CategoryTypeName,
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
            category_type_name: request.name.into_inner(),
        }
    }
}
