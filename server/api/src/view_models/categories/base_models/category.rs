use super::category_id::RequiredCategoryId;
use super::category_name::CategoryName;
use super::category_type::{CategoryTypeViewModel, IdentifiableCategoryTypeViewModel};
use super::category_type_id::RequiredCategoryTypeId;
use super::icon_name::IconName;
use business::dtos::categories::CategoryDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub type CategoryViewModel = Category<RequiredCategoryTypeId>;
pub type CategoryWithType = Category<IdentifiableCategoryTypeViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct Category<T> {
    /// Category name
    #[schema(example = "Groceries")]
    pub category: CategoryName,

    /// Icon identifier for the category
    #[schema(example = "shopping-cart")]
    pub icon: IconName,

    /// Category type (generic - can be ID or expanded)
    #[schema(inline = false)]
    pub category_type: T,

    /// Whether this is a global category available to all users
    #[schema(example = false)]
    pub is_global: bool,

    /// Whether this is a system category that cannot be modified
    #[schema(example = false)]
    pub is_system: bool,
}

pub type CategoryWithId = IdentifiableCategory<RequiredCategoryTypeId>;
pub type CategoryWithTypeAndId = IdentifiableCategory<IdentifiableCategoryTypeViewModel>;
pub type ExpandedCategoryViewModel = CategoryWithType;
pub type IdentifiableCategoryViewModel = CategoryWithId;
pub type IdentifiableExpandedCategoryViewModel = CategoryWithTypeAndId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableCategory<T> {
    /// Unique identifier for the category
    #[schema(example = 42)]
    pub id: RequiredCategoryId,

    #[serde(flatten)]
    pub category: Category<T>,
}

impl From<CategoryDto> for CategoryViewModel {
    fn from(dto: CategoryDto) -> Self {
        Self {
            category: CategoryName::from_trusted(dto.category),
            icon: IconName::from_trusted(dto.icon),
            category_type: RequiredCategoryTypeId(dto.category_type),
            is_global: dto.is_global,
            is_system: dto.is_system,
        }
    }
}

impl From<CategoryDto> for CategoryWithType {
    fn from(dto: CategoryDto) -> Self {
        Self {
            category: CategoryName::from_trusted(dto.category),
            icon: IconName::from_trusted(dto.icon),
            category_type: IdentifiableCategoryTypeViewModel {
                id: RequiredCategoryTypeId(dto.category_type),
                category_type: CategoryTypeViewModel {
                    name: dto.category_type_name,
                    is_global: dto.category_type_is_global,
                },
            },
            is_global: dto.is_global,
            is_system: dto.is_system,
        }
    }
}

impl From<CategoryDto> for CategoryWithId {
    fn from(dto: CategoryDto) -> Self {
        Self {
            id: RequiredCategoryId(dto.id),
            category: dto.into(),
        }
    }
}

impl From<CategoryDto> for CategoryWithTypeAndId {
    fn from(dto: CategoryDto) -> Self {
        Self {
            id: RequiredCategoryId(dto.id),
            category: dto.into(),
        }
    }
}
