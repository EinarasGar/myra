use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use super::transaction_dto::TransactonDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupDto {
    pub transactions: Vec<TransactonDto>,
    pub group_id: Uuid,
    pub description: String,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}
