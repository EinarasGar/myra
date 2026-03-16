use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone)]
pub struct TransactionSearchResult {
    pub transaction_id: Uuid,
    pub description: String,
    pub date_transacted: OffsetDateTime,
    pub quantity: Decimal,
    pub asset_name: String,
    pub account_name: String,
}

pub struct SearchParams {
    pub user_id: Uuid,
    pub query: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: i64,
}
