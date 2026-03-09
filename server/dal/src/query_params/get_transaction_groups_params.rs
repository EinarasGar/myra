use sqlx::types::Uuid;

use super::paging_params::PaginationMode;

pub struct GetTransactionGroupsParams {
    pub user_id: Uuid,
    pub pagination: PaginationMode,
    pub search_query: Option<String>,
}
