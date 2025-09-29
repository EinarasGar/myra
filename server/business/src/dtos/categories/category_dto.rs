use dal::models::category_models::{
    CategoryWithTypeModel, InsertCategoryModel, UpdateCategoryModel,
};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct CategoryDto {
    pub id: i32,
    pub category: String,
    pub icon: String,
    pub category_type: i32,
    pub category_type_name: String,
    pub user_id: Option<Uuid>,
    pub is_global: bool,
    pub is_system: bool,
    pub category_type_is_global: bool,
}

impl From<CategoryWithTypeModel> for CategoryDto {
    fn from(model: CategoryWithTypeModel) -> Self {
        Self {
            id: model.id,
            category: model.category,
            icon: model.icon,
            category_type: model.category_type_id,
            category_type_name: model.category_type_name,
            user_id: model.user_id,
            is_global: model.user_id.is_none(),
            is_system: model.is_system,
            category_type_is_global: model.category_type_user_id.is_none(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct CreateCategoryDto {
    pub category: String,
    pub icon: String,
    pub category_type: i32,
}

#[derive(Debug, Clone)]
pub struct UpdateCategoryDto {
    pub category: String,
    pub icon: String,
    pub category_type: i32,
}

impl From<CreateCategoryDto> for InsertCategoryModel {
    fn from(dto: CreateCategoryDto) -> Self {
        Self {
            category: dto.category,
            icon: dto.icon,
            category_type: dto.category_type,
        }
    }
}

impl From<UpdateCategoryDto> for UpdateCategoryModel {
    fn from(dto: UpdateCategoryDto) -> Self {
        Self {
            category: dto.category,
            icon: dto.icon,
            category_type: dto.category_type,
        }
    }
}
