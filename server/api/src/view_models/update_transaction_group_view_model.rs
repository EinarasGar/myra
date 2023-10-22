use business::dtos::{
    add_update_transaction_dto::AddUpdateTransactonDto,
    add_update_transaction_group_dto::AddUpdateTransactionGroupDto,
};
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use super::update_transaction_view_model::UpdateTransactionViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateTransactionGroupViewModel {
    pub id: Uuid,
    pub transactions: Vec<UpdateTransactionViewModel>,
    pub linked_transactions: Vec<Vec<UpdateTransactionViewModel>>,
    pub description: String,
    pub category_id: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

impl From<UpdateTransactionGroupViewModel> for AddUpdateTransactionGroupDto {
    fn from(p: UpdateTransactionGroupViewModel) -> Self {
        Self {
            transactions: {
                let mut transactions: Vec<AddUpdateTransactonDto> = p
                    .transactions
                    .into_iter()
                    .map(|val| val.into_dto())
                    .collect();
                transactions.append(
                    &mut p
                        .linked_transactions
                        .into_iter()
                        .map(|val| {
                            let link_id = Uuid::new_v4();
                            val.into_iter()
                                .map(|val| val.into_linked_dto(link_id))
                                .collect::<Vec<AddUpdateTransactonDto>>()
                        })
                        .flatten()
                        .collect(),
                );
                transactions
            },
            description: p.description,
            category: p.category_id,
            date: p.date,
            id: Some(p.id),
        }
    }
}
