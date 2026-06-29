use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct TransactionRow {
    pub transaction_id: Uuid,
    pub date: String,
    pub transaction_type: String,
    pub description: Option<String>,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub unit: String,
    pub account: String,
}

#[derive(Serialize)]
pub struct QueryTransactionsResult {
    pub transactions: Vec<TransactionRow>,
    pub has_more: bool,
    pub next_cursor: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

pub struct QueryTransactionsParams {
    pub query: Option<String>,
    pub account_id: Option<Uuid>,
    pub transaction_types: Option<Vec<String>>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: i64,
    pub cursor: Option<Uuid>,
}

#[derive(Serialize)]
pub struct TransactionDetailEntry {
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub asset_id: i32,
    pub asset: String,
    pub account_id: Uuid,
    pub account: String,
    pub category: Option<String>,
    pub is_fee: bool,
    pub fee_type: Option<String>,
}

#[derive(Serialize)]
pub struct TransactionDetailResult {
    pub transaction_id: Uuid,
    pub transaction_type: String,
    pub date: String,
    pub description: Option<String>,
    pub entries: Vec<TransactionDetailEntry>,
}
