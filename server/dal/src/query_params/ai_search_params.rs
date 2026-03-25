use pgvector::Vector;
use sqlx::types::Uuid;

pub struct SearchTransactionsParams {
    pub user_id: Uuid,
    pub query: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: i64,
}

pub struct AggregateTransactionsParams {
    pub user_id: Uuid,
    pub group_by: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub description_filter: Option<String>,
}

pub struct ListAccountsParams {
    pub user_id: Uuid,
}

pub struct SearchCategoriesParams {
    pub user_id: Uuid,
    pub embedding: Option<Vector>,
    pub limit: Option<i64>,
}

pub struct SearchAssetsParams {
    pub user_id: Uuid,
    pub query: Option<String>,
    pub embedding: Option<Vector>,
    pub limit: Option<i64>,
}
