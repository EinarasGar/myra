use dal::models::category_models::{
    CategoryTypeModel, InsertCategoryTypeModel, UpdateCategoryTypeModel,
};

#[derive(Debug, Clone)]
pub struct CategoryTypeDto {
    pub id: i32,
    pub category_type_name: String,
    pub is_global: bool,
}

#[derive(Debug, Clone)]
pub struct CreateCategoryTypeDto {
    pub category_type_name: String,
}

#[derive(Debug, Clone)]
pub struct UpdateCategoryTypeDto {
    pub category_type_name: String,
}

impl From<UpdateCategoryTypeDto> for UpdateCategoryTypeModel {
    fn from(dto: UpdateCategoryTypeDto) -> Self {
        Self {
            category_type_name: dto.category_type_name,
        }
    }
}

impl From<CreateCategoryTypeDto> for InsertCategoryTypeModel {
    fn from(dto: CreateCategoryTypeDto) -> Self {
        Self {
            category_type_name: dto.category_type_name,
        }
    }
}

impl From<CategoryTypeModel> for CategoryTypeDto {
    fn from(model: CategoryTypeModel) -> Self {
        Self {
            id: model.id,
            category_type_name: model.category_type_name,
            is_global: model.user_id.is_none(),
        }
    }
}
