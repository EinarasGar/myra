use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct AggregateGroupResult {
    pub group_name: String,
    pub total_amount: Decimal,
    pub transaction_count: i64,
}

pub struct AggregateParams {
    pub user_id: Uuid,
    pub group_by: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub description_filter: Option<String>,
}
