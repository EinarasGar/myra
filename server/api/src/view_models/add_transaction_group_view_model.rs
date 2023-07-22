use business::dtos::transaction_dto::add_transaction_dtos::AddUpdateTransactionGroupDto;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

use super::add_transaction_view_model::AddTransactonViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactionGroupViewModel {
    pub transactions: Vec<AddTransactonViewModel>,
    pub description: String,
    pub category_id: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

impl From<AddTransactionGroupViewModel> for AddUpdateTransactionGroupDto {
    fn from(p: AddTransactionGroupViewModel) -> Self {
        Self {
            transactions: p
                .transactions
                .iter()
                .map(|val| val.clone().into())
                .collect(),
            description: p.description,
            category: p.category_id,
            date: p.date,
            id: None,
        }
    }
}
