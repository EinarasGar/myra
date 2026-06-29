use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
pub struct ListAccountsArgs {}

#[derive(Deserialize)]
pub struct QueryTransactionsArgs {
    pub query: Option<String>,
    pub account_id: Option<String>,
    pub transaction_types: Option<Vec<String>>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}

#[derive(Deserialize)]
pub struct RunScriptArgs {
    pub script: String,
    #[serde(default)]
    pub datasets: Vec<DatasetSpec>,
}

#[derive(Deserialize)]
pub struct DatasetSpec {
    pub name: String,
    pub tool: String,
    #[serde(default)]
    pub args: Value,
}

#[derive(Deserialize)]
pub struct AggregateTransactionsArgs {
    pub group_by: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub description_filter: Option<String>,
    pub account_id: Option<String>,
    pub currency_asset_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct SearchCategoriesArgs {
    pub query: Option<String>,
}

#[derive(Deserialize)]
pub struct SearchAssetsArgs {
    pub query: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateTransactionArgs {
    pub date: String,
    pub description: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub account_id: String,
    pub category_id: i32,
    pub asset_id: i32,
}

#[derive(Deserialize)]
pub struct GroupTransactionsArgs {
    pub transaction_ids: Vec<String>,
    pub description: String,
    pub category_id: i32,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateCustomAssetArgs {
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub base_pair_id: i32,
}

#[derive(Deserialize)]
pub struct RecordAssetTradeArgs {
    pub side: String,
    pub asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub quantity: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_amount: Decimal,
    pub currency_asset_id: Option<i32>,
    pub account_id: String,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct GetNetWorthHistoryArgs {
    pub range: String,
    pub account_id: Option<String>,
    pub reference_asset_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct GetHoldingsArgs {
    pub account_id: Option<String>,
    pub asset_id: Option<i32>,
    pub group_by: Option<String>,
    pub summary: Option<bool>,
    pub reference_asset_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct GetPortfolioOverviewArgs {
    pub account_id: Option<String>,
    pub asset_id: Option<i32>,
    pub include_positions: Option<bool>,
    pub reference_asset_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct GetAssetPriceArgs {
    pub asset_id: i32,
    pub quote_asset_id: Option<i32>,
    pub range: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

#[derive(Deserialize)]
pub struct GetTransactionDetailArgs {
    pub transaction_id: String,
}

#[derive(Deserialize)]
pub struct RecordTransferArgs {
    pub transfer_kind: String,
    pub from_account_id: String,
    pub to_account_id: String,
    pub asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct RecordCashTransferArgs {
    pub direction: String,
    pub account_id: String,
    pub asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct RecordAssetTransferArgs {
    pub direction: String,
    pub account_id: String,
    pub asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub quantity: Decimal,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct RecordAssetSwapArgs {
    pub account_id: String,
    pub from_asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub from_quantity: Decimal,
    pub to_asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub to_quantity: Decimal,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateAssetValuationArgs {
    pub asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub value: Decimal,
    pub currency_asset_id: Option<i32>,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct RecordDividendArgs {
    pub dividend_kind: String,
    pub paying_asset_id: i32,
    pub account_id: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub currency_asset_id: Option<i32>,
    #[serde(default, with = "rust_decimal::serde::arbitrary_precision_option")]
    pub withholding_amount: Option<Decimal>,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct RecordFeeArgs {
    pub account_id: String,
    pub asset_id: i32,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateTransactionArgs {
    pub transaction_id: String,
    pub date: Option<String>,
    pub description: Option<String>,
    #[serde(default, with = "rust_decimal::serde::arbitrary_precision_option")]
    pub amount: Option<Decimal>,
    pub category_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct DeleteTransactionArgs {
    pub transaction_id: String,
}
