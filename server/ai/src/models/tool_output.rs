use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ListAccountsArgs {}

#[derive(Deserialize)]
pub struct SearchTransactionsArgs {
    pub query: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub transactions: Vec<TransactionResult>,
    pub total_count: usize,
    pub total_amount: Decimal,
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
