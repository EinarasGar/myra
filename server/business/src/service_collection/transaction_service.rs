use std::{
    collections::{BTreeMap, HashMap, HashSet},
    hash::Hash,
    vec,
};

use dal::{
    database_context::MyraDb,
    db_sets::{portfolio_db_set::PortfolioDbSet, transaction_db_set::TransactionDbSet},
    models::{
        portfolio_models::PortfolioUpdateModel,
        transaction_models::{
            AddTransactionDescriptionModel, AddTransactionGroupModel, AddTransactionModel,
            TransactionWithGroupModel,
        },
    },
};
use rust_decimal::Decimal;
use tracing::{info_span, Instrument};
use uuid::Uuid;

use crate::dtos::{
    portfolio_dto::PortfolioAccountDto,
    transaction_dto::{
        add_transaction_dtos::{AddUpdateTransactionGroupDto, AddUpdateTransactonDto},
        get_transaction_dtos::{TransactionGroupDto, TransactonDto},
        CategoryDto,
    },
};

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

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn add_transaction_group(
        &self,
        user_id: Uuid,
        group: AddUpdateTransactionGroupDto,
    ) -> anyhow::Result<TransactionGroupDto> {
        let group_id = Uuid::new_v4();

        let dal_group = AddTransactionGroupModel {
            group_id,
            category_id: group.category,
            description: group.description,
            date: group.date,
        };

        let dal_transactions = create_add_transaction_model(&group.transactions, user_id, group_id);

        //Start SQL transaction. If anything following fails, no changes will be made to the database
        let mut trans = self.db.get_transaction().await?;

        let mut quantities_map = std::collections::HashMap::new();
        dal_transactions.clone().iter().for_each(|model| {
            update_quantity_sum(
                &mut quantities_map,
                model.user_id,
                model.asset_id,
                model.account_id,
                model.quantity,
            )
        });

        //Iterate over the hashmap and create a list of portfolio updates
        let portfolio_updates = create_portfolio_updates_from_map(quantities_map);

        //Update portfolio
        trans.update_portfolio(portfolio_updates).await?;

        //Insert new transcations and get their auto-generated ids back
        let mut new_transaction_ids = trans.insert_transactions(dal_transactions.clone()).await?;

        //As we are using this array to pop elements from, reverse it so its in order
        new_transaction_ids.reverse();

        //Insert group
        trans.insert_transaction_group(dal_group.clone()).await?;

        //Create a list of required description updates. If the list is empty, we don't need to update
        let transaction_decription_models =
            create_add_description_models(&group.transactions, &new_transaction_ids);

        if transaction_decription_models.len() > 0 {
            trans
                .insert_descriptions(transaction_decription_models)
                .await?;
        }

        let account_ids_vec: Vec<Uuid> = dal_transactions.iter().map(|x| x.account_id).collect();
        let account_ids_unique_vec: Vec<Uuid> = get_unique_vec(&account_ids_vec);
        let portfolio_account_vec = trans
            .get_portfolio_accounts_by_ids(account_ids_unique_vec)
            .await?;

        //Save changes
        trans
            .commit()
            .instrument(info_span!("commit_sql_transaction"))
            .await?;

        //Create return object
        let mut descriptions: Vec<Option<String>> = group
            .transactions
            .into_iter()
            .rev()
            .map(|x| x.description)
            .collect();

        let result: TransactionGroupDto = TransactionGroupDto {
            transactions: dal_transactions
                .into_iter()
                .map(|model| TransactonDto {
                    transaction_id: new_transaction_ids.pop().unwrap(),
                    asset_id: model.asset_id,
                    quantity: model.quantity,
                    category: model.category_id,
                    date: model.date,
                    account: PortfolioAccountDto {
                        account_id: Some(model.account_id),
                        account_name: portfolio_account_vec
                            .iter()
                            .find(|acc| acc.id == model.account_id)
                            .unwrap()
                            .name
                            .clone(),
                    },
                    description: descriptions.pop().unwrap(),
                })
                .collect(),
            group_id: dal_group.group_id,
            description: dal_group.description,
            category: dal_group.category_id,
            date: dal_group.date,
        };

        Ok(result)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn update_transaction_group(
        &self,
        user_id: Uuid,
        group: AddUpdateTransactionGroupDto,
    ) -> anyhow::Result<TransactionGroupDto> {
        //Start SQL transaction. If anything following fails, no changes will be made to the database
        let mut trans = self.db.get_transaction().await?;

        let group_id = group.id.unwrap();

        let old_group_transactions = trans.get_transaction_group(group_id).await?;

        //Compare the group data and update it if changed
        let old_group_data = AddTransactionGroupModel {
            group_id: old_group_transactions[0].group_id.clone(),
            category_id: old_group_transactions[0].group_category_id.clone(),
            description: old_group_transactions[0].group_description.clone(),
            date: old_group_transactions[0].date_added.clone(),
        };

        let updated_group = AddTransactionGroupModel {
            group_id: group_id,
            category_id: group.category,
            description: group.description,
            date: group.date,
        };

        let mut quantities_map = std::collections::HashMap::new();

        let mut added: Vec<AddUpdateTransactonDto> = Vec::new();
        let mut removed_ids: Vec<i32> = Vec::new();
        let mut updated: Vec<(TransactionWithGroupModel, AddUpdateTransactonDto)> = Vec::new();

        for old_trans in old_group_transactions.clone() {
            let found = group
                .transactions
                .iter()
                .any(|new_trans| new_trans.id == Some(old_trans.id));
            if !found {
                //Run for each deleted transaction
                update_quantity_sum(
                    &mut quantities_map,
                    old_trans.user_id,
                    old_trans.asset_id,
                    old_trans.account_id,
                    -old_trans.quantity,
                );
                removed_ids.push(old_trans.id);
            }
        }

        for new_trans in group.transactions.clone() {
            if new_trans.id.is_none() {
                update_quantity_sum(
                    &mut quantities_map,
                    user_id,
                    new_trans.asset_id,
                    new_trans.account_id.unwrap(),
                    new_trans.quantity,
                );
                added.push(new_trans);
                continue;
            }

            for old_trans in old_group_transactions.clone() {
                if new_trans.id.is_some_and(|x| x == old_trans.id)
                    && !new_trans.compare_full(&old_trans)
                {
                    update_quantity_sum(
                        &mut quantities_map,
                        old_trans.user_id,
                        old_trans.asset_id,
                        old_trans.account_id,
                        -old_trans.quantity,
                    );
                    update_quantity_sum(
                        &mut quantities_map,
                        user_id,
                        new_trans.asset_id,
                        new_trans.account_id.unwrap(),
                        new_trans.quantity,
                    );

                    updated.push((old_trans.clone(), new_trans.clone()));
                    break;
                }
            }
        }

        let portfolio_updates = create_portfolio_updates_from_map(quantities_map);
        let dal_transactions = create_add_transaction_model(&added, user_id, group_id);

        if old_group_data != updated_group {
            trans.update_group(updated_group.clone()).await?;
        }

        if removed_ids.len() > 0 {
            trans.delete_descriptions(removed_ids.clone()).await?;
            trans.delete_transactions(removed_ids).await?;
        }

        if portfolio_updates.len() > 0 {
            trans.update_portfolio(portfolio_updates).await?;
        }

        let mut new_transaction_ids: Vec<i32> = Vec::new();
        if dal_transactions.len() > 0 {
            new_transaction_ids = trans.insert_transactions(dal_transactions.clone()).await?;
            new_transaction_ids.reverse();
            let transaction_decription_models =
                create_add_description_models(&added, &new_transaction_ids);

            if transaction_decription_models.len() > 0 {
                trans
                    .insert_descriptions(transaction_decription_models)
                    .await?;
            }
        }

        for updated_trans in updated.clone() {
            let old = updated_trans.0;
            let new = updated_trans.1.clone();

            if old.description != new.description && new.description.is_some() {
                trans
                    .update_description(old.id, new.description.clone().unwrap())
                    .await?;
            }

            let new_model = AddTransactionModel {
                user_id,
                group_id,
                asset_id: new.asset_id,
                category_id: new.category,
                quantity: new.quantity,
                date: new.date,
                account_id: match new.account_id {
                    Some(acc) => acc,
                    None => user_id,
                },
            };

            //the logic here is that we only compare if the core transaction model
            //has changed. any data stored in other tables is to be comapred before
            if !new.compare_core(&old) {
                trans.update_transaction(old.id, new_model).await?;
            }
        }

        let account_ids_vec: Vec<Uuid> = group
            .transactions
            .iter()
            .filter_map(|x| x.account_id)
            .collect();

        let account_ids_unique_vec: Vec<Uuid> = get_unique_vec(&account_ids_vec);
        let portfolio_account_vec = trans
            .get_portfolio_accounts_by_ids(account_ids_unique_vec)
            .await?;

        //Save changes
        trans
            .commit()
            .instrument(info_span!("commit_sql_transaction"))
            .await?;

        let result: TransactionGroupDto = TransactionGroupDto {
            transactions: group
                .transactions
                .into_iter()
                .map(|x| TransactonDto {
                    transaction_id: match x.id {
                        Some(id) => id,
                        None => new_transaction_ids.pop().unwrap(),
                    },
                    asset_id: x.asset_id,
                    quantity: x.quantity,
                    category: x.category,
                    date: x.date,
                    account: PortfolioAccountDto {
                        account_id: x.account_id,
                        account_name: portfolio_account_vec
                            .iter()
                            .find(|acc| acc.id == x.account_id.unwrap())
                            .unwrap()
                            .name
                            .clone(),
                    },
                    description: x.description,
                })
                .collect(),
            group_id: updated_group.group_id,
            description: updated_group.description,
            category: updated_group.category_id,
            date: updated_group.date,
        };

        Ok(result)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_transaction_groups(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionGroupDto>> {
        //Get list of unformatted transactions from database
        let transaction_vec = self
            .db
            .get_connection()
            .await?
            .get_transactions(user_id)
            .await?;

        //Asign the transactions to groups
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

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_all_categories(&self) -> anyhow::Result<Vec<CategoryDto>> {
        let mut conn = self.db.get_connection().await?;
        let models = conn.get_categories().await?;
        let ret_vec: Vec<CategoryDto> = models.iter().map(|val| val.clone().into()).collect();
        Ok(ret_vec)
    }
}

fn update_quantity_sum(
    quantities_map: &mut HashMap<(Uuid, i32, Uuid), Decimal>,
    user_id: Uuid,
    asset_id: i32,
    account_id: Uuid,
    quantity: Decimal,
) {
    let sum = quantities_map
        .entry((user_id, asset_id, account_id))
        .or_insert(Decimal::new(0, 0));
    *sum += quantity;
}

fn create_portfolio_updates_from_map(
    quantities_map: HashMap<(Uuid, i32, Uuid), Decimal>,
) -> Vec<PortfolioUpdateModel> {
    //Iterate over the hashmap and create a list of portfolio updates
    let mut portfolio_updates: Vec<PortfolioUpdateModel> = Vec::new();
    for ((user_id, asset_id, account_id), sum) in quantities_map {
        portfolio_updates.push(PortfolioUpdateModel {
            user_id: user_id,
            asset_id: asset_id,
            account_id: account_id,
            sum: sum,
        })
    }
    return portfolio_updates;
}

fn create_add_transaction_model(
    transactions: &Vec<AddUpdateTransactonDto>,
    user_id: Uuid,
    group_id: Uuid,
) -> Vec<AddTransactionModel> {
    transactions
        .iter()
        .map(|trans| AddTransactionModel {
            user_id: user_id,
            group_id: group_id,
            asset_id: trans.asset_id,
            category_id: trans.category,
            quantity: trans.quantity,
            date: trans.date,
            account_id: match trans.account_id {
                Some(acc) => acc,
                None => user_id,
            },
        })
        .collect()
}

fn create_add_description_models(
    models: &Vec<AddUpdateTransactonDto>,
    new_ids: &Vec<i32>,
) -> Vec<AddTransactionDescriptionModel> {
    let mut transaction_decription_models: Vec<AddTransactionDescriptionModel> = Vec::new();
    let mut new_transaction_ids_for_description = new_ids.clone();
    for model in models.clone().into_iter() {
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
    transaction_decription_models
}

fn get_unique_vec<T>(input: &Vec<T>) -> Vec<T>
where
    T: Eq + Hash + Clone,
{
    // Use a HashSet to store unique Ts
    let mut unique_vals: HashSet<T> = HashSet::new();

    // Filter out duplicates and collect unique ids
    input
        .iter()
        .filter_map(|x| {
            // Insert returns false if the value already exists (i.e., it's a duplicate),
            // so we can use this to filter out duplicates and collect only unique values.
            if unique_vals.insert(x.clone()) {
                Some(x.clone())
            } else {
                None
            }
        })
        .collect()
}
