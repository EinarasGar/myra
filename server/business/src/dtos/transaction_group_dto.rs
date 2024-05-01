use time::OffsetDateTime;
use uuid::Uuid;

use super::transaction_dto::TransactionDto;

pub struct TransactionGroupDto {
    pub transactions: Vec<TransactionDto>,
    pub group_id: Option<Uuid>,
    pub description: String,
    pub category: i32,
    pub date: OffsetDateTime,
}
