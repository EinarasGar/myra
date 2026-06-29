use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct AggregateGroupResult {
    pub group_name: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_amount: Decimal,
    pub transaction_count: i64,
}

#[derive(Serialize)]
pub struct AggregateResult {
    pub currency: String,
    pub groups: Vec<AggregateGroupResult>,
    #[serde(skip)]
    pub has_more: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

pub struct AggregateParams {
    pub group_by: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub description_filter: Option<String>,
    pub account_id: Option<Uuid>,
    pub currency_asset_id: Option<i32>,
    pub limit: i64,
}
