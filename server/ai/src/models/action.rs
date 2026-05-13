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

pub struct CreateCustomAssetParams {
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub base_pair_id: i32,
}

#[derive(Serialize)]
pub struct CreateCustomAssetResult {
    pub asset_id: i32,
    pub message: String,
}

#[derive(Debug, Clone, Copy)]
pub enum RecordAssetTradeSide {
    Buy,
    Sell,
}

pub struct RecordAssetTradeParams {
    pub side: RecordAssetTradeSide,
    pub ticker: String,
    pub quantity: Decimal,
    pub total_amount: Decimal,
    pub currency_ticker: Option<String>,
    pub account_id: Option<Uuid>,
    pub account_name: Option<String>,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordAssetTradeResult {
    pub group_id: Uuid,
    pub account_used: String,
    pub asset_ticker: String,
    pub currency_ticker: String,
    pub message: String,
}
