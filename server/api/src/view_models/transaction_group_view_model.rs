use std::{collections::HashMap, hash::Hash};

use business::dtos::transaction_group_dto::TransactionGroupDto;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use super::transaction_view_model::TransactionViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupViewModel {
    pub transactions: Vec<TransactionViewModel>,
    pub linked_transactions: Vec<Vec<TransactionViewModel>>,
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
                .iter()
                .filter(|x| x.link_id.is_none())
                .map(|x| x.clone().into())
                .collect(),
            linked_transactions: {
                let mut linked_transactions: HashMap<Uuid, Vec<TransactionViewModel>> =
                    HashMap::new();
                p.transactions
                    .into_iter()
                    .filter(|x| x.link_id.is_some())
                    .for_each(|x| {
                        let linked_transactions_for_id = linked_transactions
                            .entry(x.link_id.unwrap())
                            .or_insert_with(Vec::new);
                        linked_transactions_for_id.push(x.into());
                    });
                linked_transactions.into_values().collect()
            },
            description: p.description,
            date: p.date,
            category_id: p.category,
            id: p.group_id,
        }
    }
}
