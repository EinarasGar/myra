use std::collections::HashMap;

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

pub type TranscationGroupReqData = business::models::transactions::AddTransactionGroupDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionRespData {
    pub transaction_id: i32,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub description: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupRespData {
    pub groups: HashMap<Uuid, Vec<TransactionRespData>>,
}
