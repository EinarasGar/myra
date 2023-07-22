use business::dtos::transaction_dto::get_transaction_dtos::TransactionGroupDto;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use super::transaction_view_model::TransactionViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupViewModel {
    pub transactions: Vec<TransactionViewModel>,
    pub description: String,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub category_id: i32,
    pub id: Uuid,
}

impl From<TransactionGroupDto> for TransactionGroupViewModel {
    fn from(p: TransactionGroupDto) -> Self {
        Self {
            transactions: p
                .transactions
                .into_iter()
                .map(|t| TransactionViewModel::from(t))
                .collect(),
            description: p.description,
            date: p.date,
            category_id: p.category,
            id: p.group_id,
        }
    }
}

impl From<TransactionGroupViewModel> for TransactionGroupDto {
    fn from(p: TransactionGroupViewModel) -> Self {
        Self {
            transactions: p
                .transactions
                .iter()
                .map(|val| val.clone().into())
                .collect(),
            description: p.description,
            category: p.category_id,
            date: p.date,
            group_id: p.id,
        }
    }
}
