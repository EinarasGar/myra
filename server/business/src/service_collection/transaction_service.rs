#[mockall_double::double]
use dal::database_context::MyraDb;

use dal::{models::transaction_models::AddTransactionModel, queries::transaction_data_queries};
use mockall::automock;

use uuid::Uuid;

use crate::entities::transactions::transaction::Transaction;

use super::asset_service::AssetsService;

pub struct TransactionService {
    db: MyraDb,
    _asset_service: AssetsService,
}

#[automock]
impl TransactionService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            _asset_service: AssetsService::new(db.clone()),
            db,
        }
    }

    pub(crate) async fn add_transactions_info(
        &self,
        transactions: &mut [Transaction],
    ) -> anyhow::Result<()> {
        let new_transaction_models = transactions
            .iter()
            .map(|x| x.get_add_transaction_model())
            .collect::<Vec<AddTransactionModel>>();

        let query = transaction_data_queries::insert_transactions(new_transaction_models);
        let new_ids: Vec<Uuid> = self.db.fetch_all_scalar(query).await?;

        transactions.iter_mut().enumerate().for_each(|(i, x)| {
            x.set_transaction_id(new_ids[i]);
        });

        Ok(())
    }

    // pub async fn add_transaction_descriptions(
    //     &self,
    //     transactions: Vec<Transaction>,
    // ) -> anyhow::Result<Vec<Transaction>> {
    //     let new_desciption_models: Vec<AddTransactionDescriptionModel> = transactions
    //         .iter()
    //         .filter_map(|x| x.get_transaction_description())
    //         .collect();

    //     if !new_desciption_models.is_empty() {
    //         let query = transaction_data_queries::insert_descriptions(new_desciption_models);
    //         self.db.execute(query).await?;
    //     }

    //     Ok(transactions)
    // }

    // pub(crate) async fn get_transactions_descriptions(
    //     &self,
    //     mut transactions: Vec<Transaction>,
    // ) -> anyhow::Result<Vec<Transaction>> {
    //     let transaction_ids_for_descriptions: Vec<Uuid> = transactions
    //         .iter()
    //         .filter(|x| x.transaction_description_available())
    //         .filter_map(|x| x.get_transaction_id())
    //         .collect();

    //     if !transaction_ids_for_descriptions.is_empty() {
    //         let query = transaction_data_queries::get_transactions_description(
    //             transaction_ids_for_descriptions,
    //         );

    //         let models = self
    //             .db
    //             .fetch_all::<TransactionDescriptionModel>(query)
    //             .await?;

    //         models.iter().for_each(|model| {
    //             transactions
    //                 .iter_mut()
    //                 .find(|x| x.get_transaction_id() == Some(model.transaction_id))
    //                 .expect("as")
    //                 .set_transaction_description(Some(model.description.clone()));
    //         });
    //     }

    //     Ok(transactions)
    // }

    // #[tracing::instrument(skip_all, err)]
    // pub async fn add_transaction_group(
    //     &self,
    //     user_id: Uuid,
    //     group: AddUpdateTransactionGroupDto,
    // ) -> anyhow::Result<TransactionGroupDto> {
    //     unimplemented!();
    //     let group_id = Uuid::new_v4();

    //     let dal_group = AddUpdateTransactionGroupModel {
    //         group_id,
    //         category_id: group.category,
    //         description: group.description,
    //         date: group.date,
    //     };

    //     let dal_transactions = create_add_transaction_model(&group.transactions, user_id, group_id);

    //     //Start SQL transaction. If anything following fails, no changes will be made to the database
    //     self.db.start_transaction().await?;

    //     let asset_ids = group
    //         .transactions
    //         .iter()
    //         .map(|x| x.asset_id)
    //         .collect::<Vec<i32>>();
    //     let unique_asset_ids = get_unique_vec(&asset_ids);

    //     self.asset_service
    //         .check_assets_access(user_id, unique_asset_ids)
    //         .await?;

    //     let mut quantities_map = std::collections::HashMap::new();
    //     dal_transactions.clone().iter().for_each(|model| {
    //         update_quantity_sum(
    //             &mut quantities_map,
    //             model.user_id,
    //             model.asset_id,
    //             model.account_id,
    //             model.quantity,
    //         )
    //     });

    //     //Iterate over the hashmap and create a list of portfolio updates
    //     let portfolio_updates = create_portfolio_updates_from_map(quantities_map);

    //     //Update portfolio
    //     let query = portfolio_queries::update_portfolio(portfolio_updates);
    //     self.db.execute(query).await?;

    //     //Insert new transcations and get their auto-generated ids back
    //     let query = transaction_queries::insert_transactions(dal_transactions.clone());

    //     let mut new_transaction_ids = self.db.fetch_all_scalar(query).await?;

    //     //As we are using this array to pop elements from, reverse it so its in order
    //     new_transaction_ids.reverse();

    //     //Insert group
    //     let query = transaction_queries::insert_transaction_group(dal_group.clone());
    //     self.db.execute(query).await?;

    //     //Create a list of required description updates. If the list is empty, we don't need to update
    //     let transaction_decription_models =
    //         create_add_description_models(&group.transactions, &new_transaction_ids);

    //     if !transaction_decription_models.is_empty() {
    //         let query = transaction_queries::insert_descriptions(transaction_decription_models);
    //         self.db.execute(query).await?;
    //     }

    //     let account_ids_vec: Vec<Uuid> = dal_transactions.iter().map(|x| x.account_id).collect();
    //     let account_ids_unique_vec: Vec<Uuid> = get_unique_vec(&account_ids_vec);

    //     let query = portfolio_queries::get_portfolio_accounts_by_ids(account_ids_unique_vec);
    //     let portfolio_account_vec = self
    //         .db
    //         .fetch_all::<PortfolioAccountIdNameModel>(query)
    //         .await?;

    //     //Save changes
    //     self.db.commit_transaction().await?;

    //     //Create return object
    //     let mut descriptions: Vec<Option<String>> = group
    //         .transactions
    //         .into_iter()
    //         .rev()
    //         .map(|x| x.description)
    //         .collect();

    //     let result: TransactionGroupDto = TransactionGroupDto {
    //         transactions: dal_transactions
    //             .into_iter()
    //             .map(|model| TransactionDto {
    //                 transaction_id: new_transaction_ids.pop().unwrap(),
    //                 asset_id: model.asset_id,
    //                 quantity: model.quantity,
    //                 category: model.category_id,
    //                 date: model.date,
    //                 account: PortfolioAccountDto {
    //                     account_id: Some(model.account_id),
    //                     account_name: portfolio_account_vec
    //                         .iter()
    //                         .find(|acc| acc.id == model.account_id)
    //                         .unwrap()
    //                         .name
    //                         .clone(),
    //                 },
    //                 description: descriptions.pop().unwrap(),
    //                 link_id: model.portfolio_event_id,
    //             })
    //             .collect(),
    //         group_id: dal_group.group_id,
    //         description: dal_group.description,
    //         category: dal_group.category_id,
    //         date: dal_group.date,
    //     };

    //     Ok(result)
    // }

    // #[tracing::instrument(skip_all, err)]
    // pub async fn update_transaction_group(
    //     &self,
    //     user_id: Uuid,
    //     group: AddUpdateTransactionGroupDto,
    // ) -> anyhow::Result<TransactionGroupDto> {
    //     //Start SQL transaction. If anything following fails, no changes will be made to the database
    //     self.db.start_transaction().await?;

    //     let asset_ids = group
    //         .transactions
    //         .iter()
    //         .map(|x| x.asset_id)
    //         .collect::<Vec<i32>>();
    //     let unique_asset_ids = get_unique_vec(&asset_ids);

    //     self.asset_service
    //         .check_assets_access(user_id, unique_asset_ids)
    //         .await?;

    //     let group_id = group.id.unwrap();

    //     let query = transaction_queries::get_transaction_group(group_id);
    //     let old_group_transactions = self
    //         .db
    //         .fetch_all::<TransactionWithGroupModel>(query)
    //         .await?;

    //     //Compare the group data and update it if changed
    //     let old_group_data = AddUpdateTransactionGroupModel {
    //         group_id: old_group_transactions[0].group_id,
    //         category_id: old_group_transactions[0].group_category_id,
    //         description: old_group_transactions[0].group_description.clone(),
    //         date: old_group_transactions[0].date_added,
    //     };

    //     let updated_group = AddUpdateTransactionGroupModel {
    //         group_id,
    //         category_id: group.category,
    //         description: group.description,
    //         date: group.date,
    //     };

    //     let mut quantities_map = std::collections::HashMap::new();

    //     let mut added: Vec<AddUpdateTransactonDto> = Vec::new();
    //     let mut removed_ids: Vec<i32> = Vec::new();
    //     let mut updated: Vec<(TransactionWithGroupModel, AddUpdateTransactonDto)> = Vec::new();

    //     for old_trans in old_group_transactions.clone() {
    //         let found = group
    //             .transactions
    //             .iter()
    //             .any(|new_trans| new_trans.id == Some(old_trans.id));
    //         if !found {
    //             //Run for each deleted transaction
    //             update_quantity_sum(
    //                 &mut quantities_map,
    //                 old_trans.user_id,
    //                 old_trans.asset_id,
    //                 old_trans.account_id,
    //                 -old_trans.quantity,
    //             );
    //             removed_ids.push(old_trans.id);
    //         }
    //     }

    //     for new_trans in group.transactions.clone() {
    //         if new_trans.id.is_none() {
    //             update_quantity_sum(
    //                 &mut quantities_map,
    //                 user_id,
    //                 new_trans.asset_id,
    //                 new_trans.account_id.unwrap(),
    //                 new_trans.quantity,
    //             );
    //             added.push(new_trans);
    //             continue;
    //         }

    //         for old_trans in old_group_transactions.clone() {
    //             if new_trans.id.is_some_and(|x| x == old_trans.id)
    //                 && !new_trans.compare_full(&old_trans)
    //             {
    //                 update_quantity_sum(
    //                     &mut quantities_map,
    //                     old_trans.user_id,
    //                     old_trans.asset_id,
    //                     old_trans.account_id,
    //                     -old_trans.quantity,
    //                 );
    //                 update_quantity_sum(
    //                     &mut quantities_map,
    //                     user_id,
    //                     new_trans.asset_id,
    //                     new_trans.account_id.unwrap(),
    //                     new_trans.quantity,
    //                 );

    //                 updated.push((old_trans.clone(), new_trans.clone()));
    //                 break;
    //             }
    //         }
    //     }
    //     let portfolio_updates = create_portfolio_updates_from_map(quantities_map);
    //     let dal_transactions = create_add_transaction_model(&added, user_id, group_id);

    //     if old_group_data != updated_group {
    //         let query = transaction_queries::update_group(updated_group.clone());
    //         self.db.execute(query).await?;
    //     }

    //     if !removed_ids.is_empty() {
    //         let query = transaction_queries::delete_descriptions(removed_ids.clone());
    //         self.db.execute(query).await?;
    //         let query = transaction_queries::delete_transactions(removed_ids);
    //         self.db.execute(query).await?;
    //     }

    //     if !portfolio_updates.is_empty() {
    //         let query = portfolio_queries::update_portfolio(portfolio_updates);
    //         self.db.execute(query).await?;
    //     }

    //     let mut new_transaction_ids: Vec<i32> = Vec::new();
    //     if !dal_transactions.is_empty() {
    //         let query = transaction_queries::insert_transactions(dal_transactions.clone());
    //         new_transaction_ids = self.db.fetch_all_scalar(query).await?;
    //         new_transaction_ids.reverse();
    //         let transaction_decription_models =
    //             create_add_description_models(&added, &new_transaction_ids);

    //         if !transaction_decription_models.is_empty() {
    //             let query = transaction_queries::insert_descriptions(transaction_decription_models);
    //             self.db.execute(query).await?;
    //         }
    //     }

    //     for updated_trans in updated.clone() {
    //         let old = updated_trans.0;
    //         let new = updated_trans.1.clone();

    //         if old.description != new.description && new.description.is_some() {
    //             let query = transaction_queries::update_description(
    //                 old.id,
    //                 new.description.clone().unwrap(),
    //             );
    //             self.db.execute(query).await?;
    //         }

    //         //the logic here is that we only compare if the core transaction model
    //         //has changed. any data stored in other tables is to be comapred before
    //         if !new.compare_core(&old) {
    //             let new_model = new.into_model(user_id, group_id);
    //             let query = transaction_queries::update_transaction(old.id, new_model);
    //             self.db.execute(query).await?;
    //         }
    //     }

    //     let account_ids_vec: Vec<Uuid> = group
    //         .transactions
    //         .iter()
    //         .filter_map(|x| x.account_id)
    //         .collect();

    //     let account_ids_unique_vec: Vec<Uuid> = get_unique_vec(&account_ids_vec);
    //     let query = portfolio_queries::get_portfolio_accounts_by_ids(account_ids_unique_vec);

    //     let portfolio_account_vec = self
    //         .db
    //         .fetch_all::<PortfolioAccountIdNameModel>(query)
    //         .await?;

    //     self.db.commit_transaction().await?;

    //     let result: TransactionGroupDto = TransactionGroupDto {
    //         transactions: group
    //             .transactions
    //             .into_iter()
    //             .map(|x| TransactionDto {
    //                 transaction_id: match x.id {
    //                     Some(id) => id,
    //                     None => new_transaction_ids.pop().unwrap(),
    //                 },
    //                 asset_id: x.asset_id,
    //                 quantity: x.quantity,
    //                 category: x.category,
    //                 date: x.date,
    //                 account: PortfolioAccountDto {
    //                     account_id: x.account_id,
    //                     account_name: portfolio_account_vec
    //                         .iter()
    //                         .find(|acc| acc.id == x.account_id.unwrap())
    //                         .unwrap()
    //                         .name
    //                         .clone(),
    //                 },
    //                 description: x.description,
    //                 link_id: x.link_id,
    //             })
    //             .collect(),
    //         group_id: updated_group.group_id,
    //         description: updated_group.description,
    //         category: updated_group.category_id,
    //         date: updated_group.date,
    //     };

    //     Ok(result)
    // }

    // #[tracing::instrument(skip_all, err)]
    // pub async fn get_transaction_groups(
    //     &self,
    //     user_id: Uuid,
    // ) -> anyhow::Result<Vec<TransactionGroupDto>> {
    //     //Get list of unformatted transactions from database
    //     let query = transaction_queries::get_transactions_with_groups(user_id);
    //     let transaction_vec = self
    //         .db
    //         .fetch_all::<TransactionWithGroupModel>(query)
    //         .await?;

    //     //Asign the transactions to groups
    //     let mut result: BTreeMap<Uuid, TransactionGroupDto> = BTreeMap::new();
    //     for transaction in transaction_vec {
    //         result
    //             .entry(transaction.group_id)
    //             .and_modify(|result_group| {
    //                 result_group.transactions.push(transaction.clone().into())
    //             })
    //             .or_insert(TransactionGroupDto {
    //                 transactions: vec![transaction.clone().into()],

    //                 //This only runs once, so therefore it picks up the values
    //                 //from first transaction. All the values in a transaction group
    //                 //are identical, so it doesnt matter that it picks valeus from
    //                 //the first one.

    //                 //I am unsure if its more efficient to join and return same fields
    //                 //or rather to do multiple queries but avoid returning identical fields
    //                 group_id: transaction.group_id,
    //                 description: transaction.group_description,
    //                 category: transaction.group_category_id,
    //                 date: transaction.date_added,
    //             });
    //     }
    //     //sort the vec by group date
    //     //TODO: revisit this as this is not efficient. The db returns in order, hashmap is not ordered and then we order agian.
    //     let mut result_dto_vec: Vec<TransactionGroupDto> = result.into_values().collect();
    //     result_dto_vec.sort_by(|a, b| b.date.cmp(&a.date));

    //     Ok(result_dto_vec)
    // }

    // #[tracing::instrument(skip_all, err)]
    // pub async fn get_all_categories(&self) -> anyhow::Result<Vec<CategoryDto>> {
    //     let query = transaction_queries::get_categories();
    //     let models = self.db.fetch_all::<CategoryModel>(query).await?;
    //     let ret_vec: Vec<CategoryDto> = models.iter().map(|val| val.clone().into()).collect();
    //     Ok(ret_vec)
    // }

    // #[tracing::instrument(skip_all, err)]
    // pub async fn delete_transaction_group(&self, group_id: Uuid) -> anyhow::Result<()> {
    //     self.db.start_transaction().await?;

    //     let mut quantities_map = std::collections::HashMap::new();
    //     let query = transaction_queries::get_transaction_group(group_id);
    //     let transactions = self
    //         .db
    //         .fetch_all::<TransactionWithGroupModel>(query)
    //         .await?;

    //     let mut removed_ids: Vec<i32> = Vec::new();
    //     for trans in transactions.clone() {
    //         //Run for each deleted transaction
    //         update_quantity_sum(
    //             &mut quantities_map,
    //             trans.user_id,
    //             trans.asset_id,
    //             trans.account_id,
    //             -trans.quantity,
    //         );
    //         removed_ids.push(trans.id);
    //     }

    //     if !removed_ids.is_empty() {
    //         let query = transaction_queries::delete_descriptions(removed_ids.clone());
    //         self.db.execute(query).await?;
    //         let query = transaction_queries::delete_transactions(removed_ids);
    //         self.db.execute(query).await?;
    //     }

    //     let portfolio_updates = create_portfolio_updates_from_map(quantities_map);
    //     if !portfolio_updates.is_empty() {
    //         let query = portfolio_queries::update_portfolio(portfolio_updates);
    //         self.db.execute(query).await?;
    //     }

    //     let query = transaction_queries::delete_transaction_group(group_id);
    //     self.db.execute(query).await?;
    //     //Save changes
    //     self.db.commit_transaction().await?;

    //     Ok(())
    // }

    // #[tracing::instrument(skip_all, err)]
    // pub async fn get_all_transaction_financials(
    //     &self,
    //     user_id: Uuid,
    // ) -> anyhow::Result<(VecDeque<TransactionFinancialsDto>, HashSet<i32>)> {
    //     let query = transaction_queries::get_transactions_financials(user_id);

    //     let financials_vec = self.db.fetch_all::<TransactionFinancials>(query).await?;

    //     let mut ids: HashSet<i32> = HashSet::new();
    //     let mut financials: VecDeque<TransactionFinancialsDto> = VecDeque::new();
    //     financials_vec.into_iter().for_each(|transaction| {
    //         ids.insert(transaction.asset_id);
    //         // financials
    //         //     .entry(transaction.date.date())
    //         //     .or_insert_with(HashMap::new)
    //         //     .entry(transaction.asset_id)
    //         //     .and_modify(|quantity| *quantity += transaction.quantity)
    //         //     .or_insert(transaction.quantity);
    //         financials.push_back(TransactionFinancialsDto {
    //             asset_id: transaction.asset_id,
    //             account_id: transaction.account_id,
    //             quantity: transaction.quantity,
    //             date: transaction.date,
    //         })
    //     });
    //     Ok((financials, ids))
    // }

    // /// Gets all users transactions that are linked with a investment purchase transaction
    // #[tracing::instrument(skip_all, err)]
    // pub async fn get_investment_transactions_with_links(
    //     &self,
    //     user_id: Uuid,
    //     asset_id: Option<i32>,
    // ) -> anyhow::Result<Vec<InvestmentDetailModel>> {
    //     let query = transaction_queries::get_investment_linked_trans_quantities_and_categories(
    //         user_id, asset_id,
    //     );
    //     Ok(self.db.fetch_all::<InvestmentDetailModel>(query).await?)
    // }

    // /// Calculates total sums of costs in reference for each asset in each account
    // /// by getting all linked transactions and adding up any expenses.
    // /// For any transactions that are not in reference asset, it gets the price
    // /// of the asset for that time in reference asset
    // #[tracing::instrument(skip_all, err)]
    // pub async fn get_sums_of_costs(
    //     &self,
    //     user_id: Uuid,
    //     reference_asset_id: i32,
    // ) -> anyhow::Result<HashMap<(i32, Uuid), Decimal>> {
    //     unimplemented!();
    //     let models = self
    //         .get_investment_transactions_with_links(user_id, None)
    //         .await?;

    //     //Group the transactions by link id
    //     let mut grouped_results_full: HashMap<Uuid, Vec<InvestmentDetailModel>> = HashMap::new();
    //     models.into_iter().for_each(|model| {
    //         let entry = grouped_results_full
    //             .entry(model.portfolio_event_id)
    //             .or_insert(Vec::new());
    //         entry.push(model);
    //     });

    //     //Remove any groups where there are more than 1 buy invetments
    //     let grouped_results: HashMap<Uuid, Vec<InvestmentDetailModel>> = grouped_results_full
    //         .into_iter()
    //         .filter(|(_, transactions)| {
    //             transactions
    //                 .iter()
    //                 .filter(|x| {
    //                     x.quantity > dec!(0)
    //                         && x.category_type.clone().is_some_and(|category| {
    //                             category == TransactionCategoryType::Investments
    //                         })
    //                 })
    //                 .count()
    //                 == 1
    //         })
    //         .collect();

    //     //Iterate over all groups and only collect infomration about assets that would need conversion to ref asset
    //     let mut data_for_asset_query: Vec<AssetIdDateDto> = Vec::new();
    //     grouped_results.iter().for_each(|(_, transactions)| {
    //         transactions.iter().cloned().for_each(|transaction| {
    //             if transaction.quantity < dec!(0) && transaction.asset_id != reference_asset_id {
    //                 data_for_asset_query.push(AssetIdDateDto {
    //                     asset_id: transaction.asset_id,
    //                     date: transaction.date,
    //                 });
    //             }
    //         })
    //     });

    //     // Fetch the prices for transactions that require reference asset conversion
    //     let mut prices: VecDeque<Option<AssetPairRateDto>> = self
    //         .asset_service
    //         .get_asset_refrence_price_by_dates(data_for_asset_query, reference_asset_id)
    //         .await?
    //         .into_iter()
    //         .collect();

    //     // Iterate over transactions in the same order as before, so that the prices fetched before are
    //     // dequeued the same way
    //     let mut results: HashMap<(i32, Uuid), Decimal> = HashMap::new();
    //     grouped_results.iter().for_each(|(_, transactions)| {
    //         //Get the investment purchase transaction, so we know which asset and account to add sum of costs to
    //         //Safe to unwrap as the groups are filtered to have only 1 buy investment
    //         let buy_investment: &InvestmentDetailModel = transactions
    //             .iter()
    //             .find(|x| {
    //                 x.quantity > dec!(0)
    //                     && x.category_type.clone().is_some_and(|category| {
    //                         category == TransactionCategoryType::Investments
    //                     })
    //             })
    //             .unwrap();
    //         let id = buy_investment.asset_id;
    //         let account = buy_investment.account_id;

    //         // Since we are iterating over the same transactions, we can pop the prices from the front
    //         // and they will be in the same order as the transactions. Here we do the actual calculation
    //         // of sums of costs
    //         transactions.iter().cloned().for_each(|transaction| {
    //             if transaction.quantity < dec!(0) {
    //                 let sum = results.entry((id, account)).or_insert(Decimal::new(0, 0));
    //                 if transaction.asset_id == reference_asset_id {
    //                     *sum -= transaction.quantity;
    //                 } else if let Some(Some(rate)) = prices.pop_front() {
    //                     *sum -= transaction.quantity * rate.rate;
    //                 }
    //             }
    //         })
    //     });

    //     Ok(results)
    // }
}

// fn update_quantity_sum(
//     quantities_map: &mut HashMap<(Uuid, i32, Uuid), Decimal>,
//     user_id: Uuid,
//     asset_id: i32,
//     account_id: Uuid,
//     quantity: Decimal,
// ) {
//     let sum = quantities_map
//         .entry((user_id, asset_id, account_id))
//         .or_insert(Decimal::new(0, 0));
//     *sum += quantity;
// }

// fn create_portfolio_updates_from_map(
//     quantities_map: HashMap<(Uuid, i32, Uuid), Decimal>,
// ) -> Vec<PortfolioUpdateModel> {
//     //Iterate over the hashmap and create a list of portfolio updates
//     let mut portfolio_updates: Vec<PortfolioUpdateModel> = Vec::new();
//     for ((user_id, asset_id, account_id), sum) in quantities_map {
//         portfolio_updates.push(PortfolioUpdateModel {
//             user_id,
//             asset_id,
//             account_id,
//             sum,
//         })
//     }
//     portfolio_updates
// }

// fn create_add_transaction_model(
//     transactions: &[AddUpdateTransactonDto],
//     user_id: Uuid,
//     group_id: Uuid,
// ) -> Vec<AddUpdateTransactionModel> {
//     transactions
//         .iter()
//         .map(|trans| trans.clone().into_model(user_id, group_id))
//         .collect()
// }

// fn create_add_description_models(
//     models: &[AddUpdateTransactonDto],
//     new_ids: &[i32],
// ) -> Vec<AddTransactionDescriptionModel> {
//     let mut transaction_decription_models: Vec<AddTransactionDescriptionModel> = Vec::new();
//     let mut new_transaction_ids_for_description = new_ids.to_owned();
//     for model in models.iter().cloned() {
//         let trans_id = new_transaction_ids_for_description
//             .pop()
//             .expect("Rows returned from insertion are less than what we passed");

//         if model.description.is_some() {
//             transaction_decription_models.push(AddTransactionDescriptionModel {
//                 transaction_id: trans_id,
//                 description: model.description.unwrap(),
//             })
//         }
//     }
//     transaction_decription_models
// }
