use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use uuid::Uuid;

use super::add_update_transaction_dto::AddUpdateTransactonDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddUpdateTransactionGroupDto {
    pub id: Option<Uuid>,
    pub transactions: Vec<AddUpdateTransactonDto>,
    pub description: String,
    pub category: i32,
    #[serde(with = "timestamp")]
    pub date: OffsetDateTime,
}
