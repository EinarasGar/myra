use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

pub struct CreateTransactionParams {
    pub date: String,
    pub description: String,
    pub amount: Decimal,
    pub account_id: Uuid,
    pub category_id: i32,
    pub asset_id: i32,
}

pub struct CreateTransactionGroupParams {
    pub date: String,
    pub description: String,
    pub category_id: i32,
    pub entries: Vec<TransactionEntryParam>,
}

pub struct TransactionEntryParam {
    pub amount: Decimal,
    pub account_id: Uuid,
    pub asset_id: i32,
    pub description: Option<String>,
    pub category_id: Option<i32>,
}

#[derive(Serialize)]
pub struct CreateTransactionResult {
    pub transaction_id: Uuid,
    pub message: String,
}

#[derive(Serialize)]
pub struct CreateTransactionGroupResult {
    pub group_id: Uuid,
    pub transaction_count: usize,
    pub message: String,
}
