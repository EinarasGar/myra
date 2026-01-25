use sqlx::types::Uuid;

pub struct GetCategoryTypesParams {
    pub user_id: Option<Uuid>,
    pub search_type: GetCategoryTypesParamsSearchType,
}

impl GetCategoryTypesParams {
    pub fn all_user(user_id: Uuid) -> Self {
        Self {
            user_id: Some(user_id),
            search_type: GetCategoryTypesParamsSearchType::All,
        }
    }

    pub fn all() -> Self {
        Self {
            user_id: None,
            search_type: GetCategoryTypesParamsSearchType::All,
        }
    }
}

pub enum GetCategoryTypesParamsSearchType {
    All,
    ByQuery(String),
}
