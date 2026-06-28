use crate::models::search::TransactionSearchResult;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::format_description::well_known::Rfc3339;

#[derive(Deserialize)]
pub struct ListAccountsArgs {}

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

#[derive(Serialize)]
pub struct InjectedTransaction {
    pub id: String,
    pub description: String,
    pub date: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub asset: String,
    pub account: String,
}

impl From<TransactionSearchResult> for InjectedTransaction {
    fn from(t: TransactionSearchResult) -> Self {
        Self {
            id: t.transaction_id.to_string(),
            description: t.description,
            date: t.date_transacted.format(&Rfc3339).unwrap_or_default(),
            amount: t.quantity,
            asset: t.asset_name,
            account: t.account_name,
        }
    }
}

#[derive(Deserialize)]
pub struct SearchTransactionsArgs {
    #[serde(default)]
    pub query: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub transactions: Vec<TransactionResult>,
    pub returned_count: usize,
    pub total_count: usize,
    pub total_amount: Decimal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Serialize)]
pub struct TransactionResult {
    pub description: String,
    pub date: String,
    pub amount: Decimal,
    pub asset: String,
    pub account: String,
}

#[derive(Deserialize)]
pub struct AggregateTransactionsArgs {
    pub group_by: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub description_filter: Option<String>,
}

#[derive(Serialize)]
pub struct AggregateResult {
    pub groups: Vec<AggregateGroup>,
}

#[derive(Serialize)]
pub struct AggregateGroup {
    pub group_name: String,
    pub total_amount: Decimal,
    pub transaction_count: i64,
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
pub struct TransactionEntryArg {
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
    pub account_id: String,
    pub asset_id: i32,
    pub description: Option<String>,
    pub category_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct CreateTransactionGroupArgs {
    pub date: String,
    pub description: String,
    pub category_id: i32,
    pub entries: Vec<TransactionEntryArg>,
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
