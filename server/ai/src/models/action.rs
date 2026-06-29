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

pub struct GroupTransactionsParams {
    pub transaction_ids: Vec<Uuid>,
    pub description: String,
    pub category_id: i32,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct CreateTransactionResult {
    pub transaction_id: Uuid,
    pub message: String,
}

#[derive(Serialize)]
pub struct GroupTransactionsResult {
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
    pub asset_id: i32,
    pub quantity: Decimal,
    pub total_amount: Decimal,
    pub currency_asset_id: Option<i32>,
    pub account_id: Uuid,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordAssetTradeResult {
    pub transaction_id: Uuid,
    pub asset_ticker: String,
    pub currency_ticker: String,
    pub message: String,
}

pub enum TransferKind {
    Cash,
    Asset,
}

pub struct RecordTransferParams {
    pub kind: TransferKind,
    pub from_account_id: Uuid,
    pub to_account_id: Uuid,
    pub asset_id: i32,
    pub amount: Decimal,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordTransferResult {
    pub transaction_id: Uuid,
    pub message: String,
}

pub enum TransferDirection {
    In,
    Out,
}

pub struct RecordCashTransferParams {
    pub direction: TransferDirection,
    pub account_id: Uuid,
    pub asset_id: i32,
    pub amount: Decimal,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordCashTransferResult {
    pub transaction_id: Uuid,
    pub message: String,
}

pub struct RecordAssetTransferParams {
    pub direction: TransferDirection,
    pub account_id: Uuid,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordAssetTransferResult {
    pub transaction_id: Uuid,
    pub message: String,
}

pub struct RecordAssetSwapParams {
    pub account_id: Uuid,
    pub from_asset_id: i32,
    pub from_quantity: Decimal,
    pub to_asset_id: i32,
    pub to_quantity: Decimal,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordAssetSwapResult {
    pub transaction_id: Uuid,
    pub message: String,
}

pub struct UpdateAssetValuationParams {
    pub asset_id: i32,
    pub value: Decimal,
    pub currency_asset_id: Option<i32>,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct UpdateAssetValuationResult {
    pub asset_id: i32,
    pub asset_ticker: String,
    pub message: String,
}

pub enum DividendKind {
    Cash,
    Asset,
}

pub struct RecordDividendParams {
    pub kind: DividendKind,
    pub paying_asset_id: i32,
    pub account_id: Uuid,
    pub amount: Decimal,
    pub currency_asset_id: Option<i32>,
    pub withholding_amount: Option<Decimal>,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordDividendResult {
    pub transaction_id: Uuid,
    pub message: String,
}

pub struct RecordFeeParams {
    pub account_id: Uuid,
    pub asset_id: i32,
    pub amount: Decimal,
    pub date: Option<String>,
}

#[derive(Serialize)]
pub struct RecordFeeResult {
    pub transaction_id: Uuid,
    pub message: String,
}

pub struct UpdateTransactionParams {
    pub transaction_id: Uuid,
    pub date: Option<String>,
    pub description: Option<String>,
    pub amount: Option<Decimal>,
    pub category_id: Option<i32>,
}

#[derive(Serialize)]
pub struct UpdateTransactionResult {
    pub transaction_id: Uuid,
    pub message: String,
}

pub struct DeleteTransactionParams {
    pub transaction_id: Uuid,
}

#[derive(Serialize)]
pub struct DeleteTransactionResult {
    pub message: String,
}
