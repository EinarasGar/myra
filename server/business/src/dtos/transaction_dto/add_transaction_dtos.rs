use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactionGroupDto {
    pub transactions: Vec<AddTransactonDto>,
    pub description: String,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactonDto {
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub account_id: Option<Uuid>,
    pub description: Option<String>,
}
