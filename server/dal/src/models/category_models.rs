use sqlx::types::Uuid;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct CategoryModel {
    pub id: i32,
    pub category: String,
    pub icon: String,
    pub category_type: i32,
    pub user_id: Option<Uuid>,
}

// Category type model
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct CategoryTypeModel {
    pub id: i32,
    pub category_type_name: String,
    pub user_id: Option<Uuid>,
}

#[derive(Debug, Clone)]
pub struct InsertCategoryModel {
    pub category: String,
    pub icon: String,
    pub category_type: i32,
}

#[derive(Debug, Clone)]
pub struct InsertCategoryTypeModel {
    pub category_type_name: String,
}

#[derive(Debug, Clone)]
pub struct UpdateCategoryModel {
    pub category: String,
    pub icon: String,
    pub category_type: i32,
}

#[derive(Debug, Clone)]
pub struct UpdateCategoryTypeModel {
    pub category_type_name: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct CategoryWithTypeModel {
    pub id: i32,
    pub category: String,
    pub icon: String,
    pub category_type_id: i32,
    pub category_type_name: String,
    pub user_id: Option<Uuid>,
    pub category_type_user_id: Option<Uuid>,
    pub is_system: bool,
}

#[derive(Debug, sqlx::FromRow)]
pub struct CategoryUsageCount {
    pub count: i64,
}
