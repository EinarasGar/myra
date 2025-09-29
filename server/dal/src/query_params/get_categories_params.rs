use sqlx::types::Uuid;

use super::paging_params::PagingParams;

pub struct GetCategoriesParams {
    pub user_id: Uuid,
    pub search_type: GetCategoriesParamsSearchType,
    pub paging: Option<PagingParams>,
}

impl GetCategoriesParams {
    pub fn by_id(user_id: Uuid, id: i32) -> Self {
        Self {
            user_id,
            search_type: GetCategoriesParamsSearchType::ById(id),
            paging: None,
        }
    }

    pub fn all(user_id: Uuid, start: u64, count: u64) -> Self {
        Self {
            user_id,
            search_type: GetCategoriesParamsSearchType::All,
            paging: Some(PagingParams { start, count }),
        }
    }

    pub fn by_query(user_id: Uuid, query: String, start: u64, count: u64) -> Self {
        Self {
            user_id,
            search_type: GetCategoriesParamsSearchType::ByQuery(query),
            paging: Some(PagingParams { start, count }),
        }
    }

    pub fn by_type(user_id: Uuid, type_id: i32, start: u64, count: u64) -> Self {
        Self {
            user_id,
            search_type: GetCategoriesParamsSearchType::ByType(type_id),
            paging: Some(PagingParams { start, count }),
        }
    }

    pub fn by_query_and_type(
        user_id: Uuid,
        query: String,
        type_id: i32,
        start: u64,
        count: u64,
    ) -> Self {
        Self {
            user_id,
            search_type: GetCategoriesParamsSearchType::ByQueryAndType { query, type_id },
            paging: Some(PagingParams { start, count }),
        }
    }
}

pub enum GetCategoriesParamsSearchType {
    ById(i32),
    All,
    ByQuery(String),
    ByType(i32),
    ByQueryAndType { query: String, type_id: i32 },
}
