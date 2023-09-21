use std::{
    collections::{BTreeMap, HashMap, HashSet, VecDeque},
    hash::Hash,
    vec,
};

use dal::{
    database_context::MyraDb,
    db_sets::{
        portfolio_db_set::{self},
        transaction_db_set::{self},
    },
    models::{
        portfolio_models::{PortfolioAccountIdNameModel, PortfolioUpdateModel},
        transaction_models::{
            AddTransactionDescriptionModel, AddUpdateTransactionGroupModel,
            AddUpdateTransactionModel, CategoryModel, TransactionFinancials,
            TransactionWithGroupModel,
        },
    },
};
use rust_decimal::Decimal;

use uuid::Uuid;

use crate::dtos::{
    add_update_transaction_dto::AddUpdateTransactonDto,
    add_update_transaction_group_dto::AddUpdateTransactionGroupDto, category_dto::CategoryDto,
    portfolio_account_dto::PortfolioAccountDto, transaction_dto::TransactonDto,
    transaction_financials_dto::TransactionFinancialsDto,
    transaction_group_dto::TransactionGroupDto,
};

#[derive(Clone)]
pub struct TransactionService {
    db: MyraDb,
}

impl TransactionService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn add_transaction_group(
        &self,
        user_id: Uuid,
        group: AddUpdateTransactionGroupDto,
    ) -> anyhow::Result<TransactionGroupDto> {
        let group_id = Uuid::new_v4();

        let dal_group = AddUpdateTransactionGroupModel {
            group_id,
            category_id: group.category,
            description: group.description,
            date: group.date,
        };

        let dal_transactions = create_add_transaction_model(&group.transactions, user_id, group_id);

        //Start SQL transaction. If anything following fails, no changes will be made to the database
        self.db.get_transaction().await?;

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
        let (sql, values) = portfolio_db_set::update_portfolio(portfolio_updates);
        self.db.execute_in_trans(sql, values).await?;

        //Insert new transcations and get their auto-generated ids back
        let (sql, values) = transaction_db_set::insert_transactions(dal_transactions.clone());

        let mut new_transaction_ids = self.db.fetch_all_in_trans_scalar(sql, values).await?;

        //As we are using this array to pop elements from, reverse it so its in order
        new_transaction_ids.reverse();

        //Insert group
        let (sql, values) = transaction_db_set::insert_transaction_group(dal_group.clone());
        self.db.execute_in_trans(sql, values).await?;

        //Create a list of required description updates. If the list is empty, we don't need to update
        let transaction_decription_models =
            create_add_description_models(&group.transactions, &new_transaction_ids);

        if !transaction_decription_models.is_empty() {
            let (sql, values) =
                transaction_db_set::insert_descriptions(transaction_decription_models);
            self.db.execute_in_trans(sql, values).await?;
        }

        let account_ids_vec: Vec<Uuid> = dal_transactions.iter().map(|x| x.account_id).collect();
        let account_ids_unique_vec: Vec<Uuid> = get_unique_vec(&account_ids_vec);

        let (sql, values) = portfolio_db_set::get_portfolio_accounts_by_ids(account_ids_unique_vec);
        let portfolio_account_vec = self
            .db
            .fetch_all_in_trans::<PortfolioAccountIdNameModel>(sql, values)
            .await?;

        //Save changes
        self.db.commit_transaction().await?;

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
        self.db.get_transaction().await?;

        let group_id = group.id.unwrap();

        let (sql, values) = transaction_db_set::get_transaction_group(group_id);
        let old_group_transactions = self
            .db
            .fetch_all_in_trans::<TransactionWithGroupModel>(sql, values)
            .await?;

        //Compare the group data and update it if changed
        let old_group_data = AddUpdateTransactionGroupModel {
            group_id: old_group_transactions[0].group_id,
            category_id: old_group_transactions[0].group_category_id,
            description: old_group_transactions[0].group_description.clone(),
            date: old_group_transactions[0].date_added,
        };

        let updated_group = AddUpdateTransactionGroupModel {
            group_id,
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
            let (sql, values) = transaction_db_set::update_group(updated_group.clone());
            self.db.execute_in_trans(sql, values).await?;
        }

        if !removed_ids.is_empty() {
            let (sql, values) = transaction_db_set::delete_descriptions(removed_ids.clone());
            self.db.execute_in_trans(sql, values).await?;
            let (sql, values) = transaction_db_set::delete_transactions(removed_ids);
            self.db.execute_in_trans(sql, values).await?;
        }

        if !portfolio_updates.is_empty() {
            let (sql, values) = portfolio_db_set::update_portfolio(portfolio_updates);
            self.db.execute_in_trans(sql, values).await?;
        }

        let mut new_transaction_ids: Vec<i32> = Vec::new();
        if !dal_transactions.is_empty() {
            let (sql, values) = transaction_db_set::insert_transactions(dal_transactions.clone());
            new_transaction_ids = self.db.fetch_all_in_trans_scalar(sql, values).await?;
            new_transaction_ids.reverse();
            let transaction_decription_models =
                create_add_description_models(&added, &new_transaction_ids);

            if !transaction_decription_models.is_empty() {
                let (sql, values) =
                    transaction_db_set::insert_descriptions(transaction_decription_models);
                self.db.execute_in_trans(sql, values).await?;
            }
        }

        for updated_trans in updated.clone() {
            let old = updated_trans.0;
            let new = updated_trans.1.clone();

            if old.description != new.description && new.description.is_some() {
                let (sql, values) = transaction_db_set::update_description(
                    old.id,
                    new.description.clone().unwrap(),
                );
                self.db.execute_in_trans(sql, values).await?;
            }

            let new_model = AddUpdateTransactionModel {
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
                let (sql, values) = transaction_db_set::update_transaction(old.id, new_model);
                self.db.execute_in_trans(sql, values).await?;
            }
        }

        let account_ids_vec: Vec<Uuid> = group
            .transactions
            .iter()
            .filter_map(|x| x.account_id)
            .collect();

        let account_ids_unique_vec: Vec<Uuid> = get_unique_vec(&account_ids_vec);
        let (sql, values) = portfolio_db_set::get_portfolio_accounts_by_ids(account_ids_unique_vec);

        let portfolio_account_vec = self
            .db
            .fetch_all_in_trans::<PortfolioAccountIdNameModel>(sql, values)
            .await?;

        self.db.commit_transaction().await?;
        //Save changes
        // trans
        //     .commit()
        //     .instrument(info_span!("commit_sql_transaction"))
        //     .await?;

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
        let (sql, values) = transaction_db_set::get_transactions_with_groups(user_id);
        let transaction_vec = self
            .db
            .fetch_all::<TransactionWithGroupModel>(sql, values)
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
        let (sql, values) = transaction_db_set::get_categories();
        let models = self.db.fetch_all::<CategoryModel>(sql, values).await?;
        let ret_vec: Vec<CategoryDto> = models.iter().map(|val| val.clone().into()).collect();
        Ok(ret_vec)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn delete_transaction_group(
        &self,
        user_id: Uuid,
        group_id: Uuid,
    ) -> anyhow::Result<()> {
        self.db.get_transaction().await?;

        let mut quantities_map = std::collections::HashMap::new();
        let (sql, values) = transaction_db_set::get_transaction_group(group_id);
        let transactions = self
            .db
            .fetch_all_in_trans::<TransactionWithGroupModel>(sql, values)
            .await?;

        let mut removed_ids: Vec<i32> = Vec::new();
        for trans in transactions.clone() {
            //Run for each deleted transaction
            update_quantity_sum(
                &mut quantities_map,
                trans.user_id,
                trans.asset_id,
                trans.account_id,
                -trans.quantity,
            );
            removed_ids.push(trans.id);
        }

        if !removed_ids.is_empty() {
            let (sql, values) = transaction_db_set::delete_descriptions(removed_ids.clone());
            self.db.execute_in_trans(sql, values).await?;
            let (sql, values) = transaction_db_set::delete_transactions(removed_ids);
            self.db.execute_in_trans(sql, values).await?;
        }

        let portfolio_updates = create_portfolio_updates_from_map(quantities_map);
        if !portfolio_updates.is_empty() {
            let (sql, values) = portfolio_db_set::update_portfolio(portfolio_updates);
            self.db.execute_in_trans(sql, values).await?;
        }

        let (sql, values) = transaction_db_set::delete_transaction_group(group_id);
        self.db.execute_in_trans(sql, values).await?;
        //Save changes
        self.db.commit_transaction().await?;

        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_all_transaction_financials(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<(VecDeque<TransactionFinancialsDto>, HashSet<i32>)> {
        let (sql, values) = transaction_db_set::get_transactions_financials(user_id);

        let financials_vec = self
            .db
            .fetch_all::<TransactionFinancials>(sql, values)
            .await?;

        let mut ids: HashSet<i32> = HashSet::new();
        let mut financials: VecDeque<TransactionFinancialsDto> = VecDeque::new();
        financials_vec.into_iter().for_each(|transaction| {
            ids.insert(transaction.asset_id);
            // financials
            //     .entry(transaction.date.date())
            //     .or_insert_with(HashMap::new)
            //     .entry(transaction.asset_id)
            //     .and_modify(|quantity| *quantity += transaction.quantity)
            //     .or_insert(transaction.quantity);
            financials.push_back(TransactionFinancialsDto {
                asset_id: transaction.asset_id,
                account_id: transaction.account_id,
                quantity: transaction.quantity,
                date: transaction.date,
            })
        });
        Ok((financials, ids))
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
            user_id,
            asset_id,
            account_id,
            sum,
        })
    }
    portfolio_updates
}

fn create_add_transaction_model(
    transactions: &[AddUpdateTransactonDto],
    user_id: Uuid,
    group_id: Uuid,
) -> Vec<AddUpdateTransactionModel> {
    transactions
        .iter()
        .map(|trans| AddUpdateTransactionModel {
            user_id,
            group_id,
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
    models: &[AddUpdateTransactonDto],
    new_ids: &[i32],
) -> Vec<AddTransactionDescriptionModel> {
    let mut transaction_decription_models: Vec<AddTransactionDescriptionModel> = Vec::new();
    let mut new_transaction_ids_for_description = new_ids.to_owned();
    for model in models.iter().cloned() {
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

fn get_unique_vec<T>(input: &[T]) -> Vec<T>
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
