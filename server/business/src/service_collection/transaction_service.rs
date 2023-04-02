use std::{collections::HashMap, vec};

use dal::{
    db_sets::transaction_db_set::TransactionDbSet,
    models::transaction_models::{AddTransactionGroupModel, AddTransactionModel},
};
use uuid::Uuid;

use crate::dtos::transaction_dto::{AddTransactionGroupDto, TransactionGroupDto};

#[derive(Clone)]
pub struct TransactionService {
    transactions_db_set: TransactionDbSet,
}

impl TransactionService {
    pub fn new(transactions_db_set: TransactionDbSet) -> Self {
        Self {
            transactions_db_set,
        }
    }

    pub async fn add_transaction_group(
        &self,
        user_id: Uuid,
        group: AddTransactionGroupDto,
    ) -> anyhow::Result<(Uuid, Vec<i32>)> {
        let group_id = Uuid::new_v4();
        let mut dal_transactions: Vec<AddTransactionModel> = Vec::new();
        let dal_group = AddTransactionGroupModel {
            group_id,
            category_id: group.category,
            description: group.description,
            date: group.date,
        };

        for trans in group.transactions.iter() {
            let dal_model = AddTransactionModel {
                user_id: user_id,
                group_id: group_id,
                asset_id: trans.asset_id,
                category_id: trans.category,
                quantity: trans.quantity,
                date: trans.date,
                description: trans.description.clone(),
            };
            dal_transactions.push(dal_model);
        }

        let return_ids = self
            .transactions_db_set
            .insert_transactions_and_group(dal_transactions, dal_group)
            .await?;
        Ok((group_id, return_ids))
    }

    pub async fn get_transaction_groups(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionGroupDto>> {
        let transaction_vec = self.transactions_db_set.get_transactions(user_id).await?;

        let mut result: HashMap<Uuid, TransactionGroupDto> = HashMap::new();
        for transaction in transaction_vec {
            result
                .entry(transaction.group_id)
                .and_modify(|result_group| {
                    result_group.transactions.push(transaction.clone().into())
                })
                .or_insert(TransactionGroupDto {
                    transactions: vec![transaction.clone().into()],

                    //This only runs once, so therefore it picks up the values
                    //from first transaction. All the values in a transaction group
                    //are identical, so it doesnt matter that it picks valeus from
                    //the first one.

                    //I am unsure if its more efficient to join and return same fields
                    //or rather to do multiple queries but avoid returning identical fields
                    group_id: transaction.group_id,
                    description: transaction.group_description,
                    category: transaction.group_category_id,
                    date: transaction.date_added,
                });
        }
        Ok(result.into_values().collect())
    }
}
