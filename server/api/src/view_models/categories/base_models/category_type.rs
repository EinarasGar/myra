use super::category_type_id::RequiredCategoryTypeId;
use business::dtos::categories::CategoryTypeDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CategoryTypeViewModel {
    /// The name of the category type
    #[schema(example = "Expense")]
    pub name: String,

    /// Whether this is a global type
    #[schema(example = true)]
    pub is_global: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableCategoryTypeViewModel {
    /// The ID of the category type
    #[schema(example = 1)]
    pub id: RequiredCategoryTypeId,

    #[serde(flatten)]
    pub category_type: CategoryTypeViewModel,
}

impl From<CategoryTypeDto> for CategoryTypeViewModel {
    fn from(dto: CategoryTypeDto) -> Self {
        Self {
            name: dto.category_type_name,
            is_global: dto.is_global,
        }
    }
}

impl From<CategoryTypeDto> for IdentifiableCategoryTypeViewModel {
    fn from(dto: CategoryTypeDto) -> Self {
        Self {
            id: RequiredCategoryTypeId(dto.id),
            category_type: dto.into(),
        }
    }
}
