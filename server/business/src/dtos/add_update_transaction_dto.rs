use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddUpdateTransactonDto {
    pub id: Option<i32>,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub account_id: Option<Uuid>,
    pub description: Option<String>,
    pub link_id: Option<Uuid>,
}
