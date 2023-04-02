use std::{collections::HashMap, vec};

use dal::{db_sets::transactions::TransactionDbSet, models::transaction::TransactionModel};
use uuid::Uuid;

use crate::models::transactions::{AddTransactionGroupDto, TransactionGroupDto};

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
        let mut dal_transactions: Vec<TransactionModel> = Vec::new();

        for trans in group.transactions.iter() {
            let dal_model = TransactionModel {
                id: 0, //Id is not neccesary for insertion as it is auto generated
                user_id: user_id,
                group_id: group_id,
                asset_id: trans.asset_id,
                category_id: trans.category,
                quantity: trans.quantity,
                date: trans.date,
                description: trans.description.clone(),
                group_description: None,
            };
            dal_transactions.push(dal_model);
        }

        let return_ids = self
            .transactions_db_set
            .insert_transactions(dal_transactions)
            .await?;
        Ok((group_id, return_ids))
    }

    pub async fn get_transaction_groups(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<HashMap<Uuid, TransactionGroupDto>> {
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
                    description: transaction.group_description.clone(),
                });
        }

        Ok(result)
    }
}

// #[cfg(test)]
// mod tests {
//     use super::TransactionService;
//     use crate::{
//         models::transactions::{AddTransactionGroupDto, TransactonDto},
//         service_collection::Services,
//     };

//     async fn get_transaction_service() -> TransactionService {
//         return Services::new().await.unwrap().transaction_service;
//     }

//     // #[tokio::test]
//     // async fn verify_invalid_auth_token() {
//     //     //arrange
//     //     let service = get_transaction_service().await;

//     //     let trans1 = Transaction {
//     //         asset_id: 1,
//     //         quantity: 2000.0,
//     //         category: 1,
//     //         date: 1678747609,
//     //         description: Some("Add initial money".to_string()),
//     //     };

//     //     let group = AddTransactionGroup {
//     //         transactions: vec![trans1],
//     //     };

//     //     service.add_transaction_group(group);
//     // }
// }
