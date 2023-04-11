use std::{
    collections::{BTreeMap, HashMap},
    vec,
};

use dal::{
    database_context::MyraDb,
    db_sets::{portfolio_db_set::PortfolioDbSet, transaction_db_set::TransactionDbSet},
    models::{
        portfolio_models::PortfolioUpdateModel,
        transaction_models::{
            AddTransactionDescriptionModel, AddTransactionGroupModel, AddTransactionModel,
        },
    },
};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::dtos::transaction_dto::{AddTransactionGroupDto, TransactionGroupDto};

#[derive(Clone)]
pub struct TransactionService {
    db: MyraDb,
}

impl TransactionService {
    pub fn new(transactions_db_set: MyraDb) -> Self {
        Self {
            db: transactions_db_set,
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

        //Start SQL transaction. If anything following fails, no changes will be made to the database
        let mut trans = self.db.get_transaction().await?;

        //Maybe theres a better way to do the following, but ehh, cba
        //Create 2d hashmap of user_id and asset_id to sum the quantity
        let mut map: HashMap<Uuid, HashMap<i32, Decimal>> = std::collections::HashMap::new();
        for model in dal_transactions.clone().iter() {
            let user_map = map.entry(model.user_id).or_insert(HashMap::new());
            let sum = user_map.entry(model.asset_id).or_insert(Decimal::new(0, 0));
            *sum += model.quantity;
        }

        //Iterate over the hashmap and create a list of portfolio updates
        let mut portfolio_updates: Vec<PortfolioUpdateModel> = Vec::new();
        for (user_id, user_map) in map.iter() {
            for (asset_id, sum) in user_map.iter() {
                portfolio_updates.push(PortfolioUpdateModel {
                    user_id: *user_id,
                    asset_id: *asset_id,
                    sum: *sum,
                })
            }
        }

        trans.update_portfolio(portfolio_updates).await?;

        //Insert new transcations and get their auto-generated ids back
        let new_transaction_ids = trans.insert_transactions(dal_transactions.clone()).await?;

        //Insert group
        trans.insert_transaction_group(dal_group).await?;

        //Create a list of required description updates. If the list is empty, we don't need to update
        let mut transaction_decription_models: Vec<AddTransactionDescriptionModel> = Vec::new();
        let mut new_transaction_ids_for_description = new_transaction_ids.clone();
        for model in dal_transactions.clone().into_iter() {
            let trans_id = new_transaction_ids_for_description
                .pop()
                .expect("Rows returned from insertion are less than what we passed");

            if model.description.is_some() {
                transaction_decription_models.push(AddTransactionDescriptionModel {
                    transaction_id: trans_id,
                    description: model.description.unwrap(),
                })
            }
        }

        if transaction_decription_models.len() > 0 {
            trans
                .insert_descriptions(transaction_decription_models)
                .await?;
        }

        //Save changes
        trans.commit().await?;

        Ok((group_id, new_transaction_ids))
    }

    pub async fn get_transaction_groups(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionGroupDto>> {
        let transaction_vec = self
            .db
            .get_connection()
            .await?
            .get_transactions(user_id)
            .await?;

        let mut result: BTreeMap<Uuid, TransactionGroupDto> = BTreeMap::new();
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
        //sort the vec by group date
        //TODO: revisit this as this is not efficient. The db returns in order, hashmap is not ordered and then we order agian.
        let mut result_dto_vec: Vec<TransactionGroupDto> = result.into_values().collect();
        result_dto_vec.sort_by(|a, b| b.date.cmp(&a.date));

        Ok(result_dto_vec)
    }
}
