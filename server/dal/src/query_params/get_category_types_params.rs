use sqlx::types::Uuid;

pub struct GetCategoryTypesParams {
    pub user_id: Uuid,
    pub search_type: GetCategoryTypesParamsSearchType,
}

impl GetCategoryTypesParams {
    pub fn all(user_id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetCategoryTypesParamsSearchType::All,
        }
    }

    pub fn by_query(user_id: Uuid, query: String) -> Self {
        Self {
            user_id,
            search_type: GetCategoryTypesParamsSearchType::ByQuery(query),
        }
    }
}

pub enum GetCategoryTypesParamsSearchType {
    All,
    ByQuery(String),
}
