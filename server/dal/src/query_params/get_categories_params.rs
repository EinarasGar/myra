use sqlx::types::Uuid;

use super::paging_params::PagingParams;

pub struct GetCategoriesParams {
    pub user_id: Option<Uuid>,
    pub search_type: GetCategoriesParamsSearchType,
    pub paging: Option<PagingParams>,
}

impl GetCategoriesParams {
    pub fn user_by_id(user_id: Uuid, id: i32) -> Self {
        Self {
            user_id: Some(user_id),
            search_type: GetCategoriesParamsSearchType::ById(id),
            paging: None,
        }
    }

    pub fn shared_by_id(id: i32) -> Self {
        Self {
            user_id: None,
            search_type: GetCategoriesParamsSearchType::ById(id),
            paging: None,
        }
    }

    pub fn user_all(user_id: Uuid) -> Self {
        Self {
            user_id: Some(user_id),
            search_type: GetCategoriesParamsSearchType::All,
            paging: None,
        }
    }

    pub fn shared_all(start: u64, count: u64) -> Self {
        Self {
            user_id: None,
            search_type: GetCategoriesParamsSearchType::All,
            paging: Some(PagingParams { start, count }),
        }
    }

    pub fn shared_by_query(query: String, start: u64, count: u64) -> Self {
        Self {
            user_id: None,
            search_type: GetCategoriesParamsSearchType::ByQuery(query),
            paging: Some(PagingParams { start, count }),
        }
    }

    pub fn shared_by_type(type_id: i32, start: u64, count: u64) -> Self {
        Self {
            user_id: None,
            search_type: GetCategoriesParamsSearchType::ByType(type_id),
            paging: Some(PagingParams { start, count }),
        }
    }

    pub fn shared_by_query_and_type(query: String, type_id: i32, start: u64, count: u64) -> Self {
        Self {
            user_id: None,
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
