use business::dtos::transaction_dto::add_transaction_dtos::AddUpdateTransactionGroupDto;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use super::update_transaction_view_model::UpdateTransactonViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateTransactionGroupViewModel {
    pub id: Uuid,
    pub transactions: Vec<UpdateTransactonViewModel>,
    pub description: String,
    pub category_id: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

impl From<UpdateTransactionGroupViewModel> for AddUpdateTransactionGroupDto {
    fn from(p: UpdateTransactionGroupViewModel) -> Self {
        Self {
            transactions: p
                .transactions
                .iter()
                .map(|val| val.clone().into())
                .collect(),
            description: p.description,
            category: p.category_id,
            date: p.date,
            id: Some(p.id),
        }
    }
}
