use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactonDto {
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub description: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactionGroupDto {
    pub transactions: Vec<TransactonDto>,
}
