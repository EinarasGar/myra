use std::collections::HashMap;
use std::vec;

use anyhow::Ok;
use anyhow::Result;
#[mockall_double::double]
use dal::database_context::MyraDb;

use dal::{
    models::{
        base::TotalCount,
        transaction_models::{
            CombinedTransactionIdModel, TransactionGroupModel, TransactionIdWithGroupModel,
            TransactionWithEntriesModel,
        },
    },
    queries::{transaction_data_queries, transaction_group_queries, transaction_queries},
    query_params::{
        get_combined_transactions_params::GetCombinedTransactionsParams,
        get_transaction_with_entries_params::GetTransactionWithEntriesParams,
        paging_params::{CursorPagingParams, PagingParams},
    },
};
use mockall::automock;

use uuid::Uuid;

use crate::{
    dtos::{
        combined_transaction_dto::CombinedTransactionItem,
        page_of_results_dto::PageOfResultsDto,
        paging_dto::{CursorPageOfResultsDto, PaginationModeDto, PagingDto},
        transaction_dto::TransactionDto,
        transaction_group_dto::TransactionGroupDto,
    },
    entities::transactions::{
        transaction::Transaction,
        transaction_types::{
            create_transaction_from_dto, create_transaction_from_transaction_with_entries_model,
            create_transactions_from_transaction_with_entries_models,
        },
    },
};

use super::{
    entries_service::EntriesService, transaction_metadata_service::TransactionMetadataService,
    transaction_service::TransactionService,
};

pub struct TransactionManagementService {
    db: MyraDb,
    transaction_service: TransactionService,
    transaction_metadata_service: TransactionMetadataService,
    entries_service: EntriesService,
}

#[automock]
impl TransactionManagementService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            entries_service: EntriesService::new(providers),
            transaction_metadata_service: TransactionMetadataService::new(providers),
            transaction_service: TransactionService::new(providers),
            db: providers.db.clone(),
        }
    }

    pub async fn get_individual_transaction(
        &self,
        user_id: Uuid,
        transaction_id: Uuid,
    ) -> anyhow::Result<TransactionDto> {
        let query_params = GetTransactionWithEntriesParams::by_transaction_id(transaction_id);

        let query = transaction_queries::get_transaction_with_entries(query_params);
        let models = self
            .db
            .fetch_all::<TransactionWithEntriesModel>(query)
            .await?;

        if !models.iter().all(|x| x.user_id == user_id) {
            return Err(anyhow::anyhow!("User_id is not the owner of transaction"));
        }

        let mut transaction = create_transaction_from_transaction_with_entries_model(models)?;
        let mut transactions = vec![transaction];

        self.transaction_metadata_service
            .load_metadata(&mut transactions)
            .await?;

        transaction = transactions
            .pop()
            .expect("No transaction found in the vector");

        Ok(transaction.try_into_dto()?)
    }

    // pub async fn get_transactions(&self, user_id: Uuid) -> anyhow::Result<Vec<TransactionDto>> {
    //     let query = transaction_queries::get_all_transactions_with_entries(user_id);
    //     let models = self
    //         .db
    //         .fetch_all::<TransactionWithEntriesModel>(query)
    //         .await?;

    //     // split vector into multiple by transaction_id
    //     let grouped_results_full: Vec<Vec<TransactionWithEntriesModel>> = models
    //         .into_iter()
    //         .fold(HashMap::new(), |mut acc, model| {
    //             acc.entry(model.transaction_id)
    //                 .or_insert_with(Vec::new)
    //                 .push(model);
    //             acc
    //         })
    //         .into_values()
    //         .collect();

    //     let transactions: Vec<Transaction> = grouped_results_full
    //         .into_iter()
    //         .map(|group| create_transaction_from_transaction_with_entries_model(group))
    //         .collect::<Result<_, _>>()?;

    //     todo!();
    // }

    pub async fn search_transactions(
        &self,
        user_id: Uuid,
        paging: PagingDto,
        account_id: Option<Uuid>,
    ) -> anyhow::Result<PageOfResultsDto<TransactionDto>> {
        let query_params = match account_id {
            Some(acc_id) => GetTransactionWithEntriesParams::by_user_id_paged_with_account(
                user_id,
                paging.into(),
                acc_id,
            ),
            None => GetTransactionWithEntriesParams::by_user_id_paged(user_id, paging.into()),
        };

        let query = transaction_queries::get_transaction_with_entries(query_params);
        let counted_models = self
            .db
            .fetch_all::<TotalCount<TransactionWithEntriesModel>>(query)
            .await?;

        if let Some(first) = counted_models.first() {
            let total_results = first.total_results;
            let models: Vec<TransactionWithEntriesModel> =
                counted_models.into_iter().map(|x| x.model).collect();

            let mut transcations: Vec<Transaction> =
                create_transactions_from_transaction_with_entries_models(models)?;

            self.transaction_metadata_service
                .load_metadata(&mut transcations)
                .await?;

            let dtos = transcations
                .into_iter()
                .map(|x| x.try_into_dto())
                .collect::<Result<Vec<TransactionDto>>>()?;

            let page = PageOfResultsDto {
                results: dtos,
                total_results: total_results as i32,
            };

            Ok(page)
        } else {
            Err(anyhow::anyhow!("No results found"))
        }
    }

    pub async fn add_individual_transaction(
        &self,
        user_id: Uuid,
        transaction: TransactionDto,
    ) -> anyhow::Result<TransactionDto> {
        self.db.start_transaction().await?;
        let result = self
            .add_individual_transaction_inner(user_id, transaction)
            .await?;
        self.db.commit_transaction().await?;
        Ok(result)
    }

    pub async fn add_transactions(
        &self,
        transaction_refs: &mut [Transaction],
    ) -> anyhow::Result<()> {
        self.transaction_service
            .add_transactions_info(transaction_refs)
            .await?;

        self.transaction_metadata_service
            .write_metadata(transaction_refs)
            .await?;

        self.entries_service
            .add_transcation_entries(transaction_refs)
            .await?;

        Ok(())
    }

    pub async fn search_individual_transactions(
        &self,
        user_id: Uuid,
        pagination: PaginationModeDto,
        search_query: Option<String>,
        account_id: Option<Uuid>,
    ) -> anyhow::Result<CursorPageOfResultsDto<TransactionDto>> {
        let limit = pagination.page_size();
        let is_offset = matches!(pagination, PaginationModeDto::Offset { .. });

        // Build params using the IndividualOnly constructor; set pagination and optional fields
        let mut query_params = GetTransactionWithEntriesParams::by_user_id_individual_only(user_id);
        query_params.account_filter = account_id;
        query_params.search_query = search_query;

        // Map pagination mode, adding +1 for has_more detection
        match &pagination {
            PaginationModeDto::Offset { start, count } => {
                query_params.paging = Some(PagingParams {
                    start: *start,
                    count: count + 1,
                });
            }
            PaginationModeDto::Cursor {
                cursor_id,
                limit: l,
            } => {
                query_params.cursor_paging = Some(CursorPagingParams {
                    cursor_id: *cursor_id,
                    limit: *l,
                });
            }
            PaginationModeDto::CursorFirstPage { limit: l } => {
                // First page: treat as offset from 0
                query_params.paging = Some(PagingParams {
                    start: 0,
                    count: l + 1,
                });
            }
        }

        let query = transaction_queries::get_transaction_with_entries(query_params);
        let (models, total_results): (Vec<TransactionWithEntriesModel>, Option<i64>) = if is_offset
        {
            let total_count_models = self
                .db
                .fetch_all::<TotalCount<TransactionWithEntriesModel>>(query)
                .await?;
            let total = total_count_models.first().map(|m| m.total_results);
            let models = total_count_models.into_iter().map(|m| m.model).collect();
            (models, total)
        } else {
            let models = self
                .db
                .fetch_all::<TransactionWithEntriesModel>(query)
                .await?;
            (models, None)
        };

        let mut transactions = create_transactions_from_transaction_with_entries_models(models)?;

        // Determine has_more and cursor after grouping (models have one row per entry)
        let has_more = transactions.len() as u64 > limit;
        let next_cursor = if has_more {
            let last = &transactions[limit as usize - 1];
            let cursor = last.get_transaction_id();
            transactions.truncate(limit as usize);
            cursor
        } else {
            None
        };

        self.transaction_metadata_service
            .load_metadata(&mut transactions)
            .await?;

        let transaction_dtos = transactions
            .into_iter()
            .map(|t| t.try_into_dto())
            .collect::<Result<Vec<TransactionDto>>>()?;

        Ok(CursorPageOfResultsDto {
            results: transaction_dtos,
            has_more,
            next_cursor,
            total_results,
        })
    }

    pub async fn get_combined_transactions(
        &self,
        user_id: Uuid,
        pagination: PaginationModeDto,
        search_query: Option<String>,
    ) -> anyhow::Result<CursorPageOfResultsDto<CombinedTransactionItem>> {
        let limit = pagination.page_size();

        // Step 1: Get combined page of IDs via UNION ALL query
        let combined_params = GetCombinedTransactionsParams {
            user_id,
            pagination: pagination.into(),
            search_query,
        };
        let combined_query =
            transaction_queries::get_combined_transaction_ids_for_user(combined_params);
        let id_rows_raw = self
            .db
            .fetch_all::<TotalCount<CombinedTransactionIdModel>>(combined_query)
            .await?;
        let total_results = id_rows_raw.first().map(|r| r.total_results);
        let mut id_rows: Vec<CombinedTransactionIdModel> =
            id_rows_raw.into_iter().map(|r| r.model).collect();

        // Detect has_more
        let has_more = id_rows.len() as u64 > limit;
        if has_more {
            id_rows.truncate(limit as usize);
        }

        let next_cursor = if has_more {
            id_rows.last().map(|r| r.id)
        } else {
            None
        };

        // Step 2: Split IDs into individual vs group buckets, preserving order
        let mut individual_ids: Vec<Uuid> = Vec::new();
        let mut group_ids: Vec<Uuid> = Vec::new();
        let order: Vec<(Uuid, String)> = id_rows
            .iter()
            .map(|r| (r.id, r.item_type.clone()))
            .collect();

        for row in &id_rows {
            match row.item_type.as_str() {
                "individual" => individual_ids.push(row.id),
                "group" => group_ids.push(row.id),
                _ => {}
            }
        }

        // Step 3: Batch-fetch full data for each bucket
        let mut individual_map: HashMap<Uuid, TransactionDto> = HashMap::new();
        if !individual_ids.is_empty() {
            let tx_params = GetTransactionWithEntriesParams::by_transaction_ids(individual_ids);
            let tx_query = transaction_queries::get_transaction_with_entries(tx_params);
            let tx_models = self
                .db
                .fetch_all::<TransactionWithEntriesModel>(tx_query)
                .await?;

            let mut transactions =
                create_transactions_from_transaction_with_entries_models(tx_models)?;
            self.transaction_metadata_service
                .load_metadata(&mut transactions)
                .await?;

            for tx in transactions {
                let id = tx.get_transaction_id();
                let dto = tx.try_into_dto()?;
                if let Some(id) = id {
                    individual_map.insert(id, dto);
                }
            }
        }

        let mut group_map: HashMap<Uuid, TransactionGroupDto> = HashMap::new();
        if !group_ids.is_empty() {
            // Fetch all transaction IDs for these groups
            let tx_ids_query =
                transaction_group_queries::get_transaction_ids_by_groups(group_ids.clone());
            let tx_id_with_groups = self
                .db
                .fetch_all::<TransactionIdWithGroupModel>(tx_ids_query)
                .await?;

            let all_tx_ids: Vec<Uuid> = tx_id_with_groups.iter().map(|m| m.id).collect();
            let tx_to_group: HashMap<Uuid, Uuid> = tx_id_with_groups
                .into_iter()
                .map(|m| (m.id, m.group_id))
                .collect();

            // Batch-fetch all group models in one query
            let gq = transaction_group_queries::get_transaction_groups_by_ids(group_ids.clone());
            let group_models = self.db.fetch_all::<TransactionGroupModel>(gq).await?;
            let mut group_models_map: HashMap<Uuid, TransactionGroupModel> =
                group_models.into_iter().map(|gm| (gm.id, gm)).collect();

            // Fetch transaction details for all groups' transactions
            let mut group_tx_map: HashMap<Uuid, Vec<TransactionDto>> = HashMap::new();
            if !all_tx_ids.is_empty() {
                let tx_params = GetTransactionWithEntriesParams::by_transaction_ids(all_tx_ids);
                let tx_query = transaction_queries::get_transaction_with_entries(tx_params);
                let tx_models = self
                    .db
                    .fetch_all::<TransactionWithEntriesModel>(tx_query)
                    .await?;

                let mut transactions =
                    create_transactions_from_transaction_with_entries_models(tx_models)?;
                self.transaction_metadata_service
                    .load_metadata(&mut transactions)
                    .await?;

                let tx_dtos = transactions
                    .into_iter()
                    .map(|t| t.try_into_dto())
                    .collect::<Result<Vec<TransactionDto>>>()?;

                for tx_dto in tx_dtos {
                    if let Some(tid) = tx_dto.transaction_id {
                        if let Some(&gid) = tx_to_group.get(&tid) {
                            group_tx_map.entry(gid).or_default().push(tx_dto);
                        }
                    }
                }
            }

            // Build group DTOs
            for gid in group_ids {
                if let Some(gm) = group_models_map.remove(&gid) {
                    let transactions = group_tx_map.remove(&gid).unwrap_or_default();
                    group_map.insert(
                        gid,
                        TransactionGroupDto {
                            group_id: Some(gid),
                            description: gm.description,
                            category_id: gm.category_id,
                            date: gm.date_added,
                            transactions,
                        },
                    );
                }
            }
        }

        // Step 4: Reconstruct combined list in original UNION ALL order
        let combined: Vec<CombinedTransactionItem> = order
            .into_iter()
            .filter_map(|(id, item_type)| match item_type.as_str() {
                "individual" => individual_map
                    .remove(&id)
                    .map(CombinedTransactionItem::Individual),
                "group" => group_map.remove(&id).map(CombinedTransactionItem::Group),
                _ => None,
            })
            .collect();

        Ok(CursorPageOfResultsDto {
            results: combined,
            has_more,
            next_cursor,
            total_results,
        })
    }

    pub async fn update_individual_transaction(
        &self,
        user_id: Uuid,
        transaction_id: Uuid,
        transaction_dto: TransactionDto,
    ) -> anyhow::Result<TransactionDto> {
        self.db.start_transaction().await?;
        self.update_individual_transaction_inner(user_id, transaction_id, transaction_dto)
            .await?;
        let query = transaction_data_queries::clear_group_id_on_transaction(transaction_id);
        self.db.execute(query).await?;
        self.db.commit_transaction().await?;
        self.get_individual_transaction(user_id, transaction_id)
            .await
    }

    pub async fn delete_transactions(
        &self,
        user_id: Uuid,
        transaction_ids: Vec<Uuid>,
    ) -> anyhow::Result<()> {
        self.db.start_transaction().await?;
        self.delete_transactions_inner(user_id, transaction_ids)
            .await?;
        self.db.commit_transaction().await?;
        Ok(())
    }
}

// Inner methods used by both this service and TransactionGroupService.
// Kept outside #[automock] to avoid generating mock variants.
impl TransactionManagementService {
    pub(crate) async fn add_individual_transaction_inner(
        &self,
        user_id: Uuid,
        transaction: TransactionDto,
    ) -> anyhow::Result<TransactionDto> {
        let mut transaction: Transaction = create_transaction_from_dto(transaction, user_id)?;
        let mut transactions = vec![transaction];
        self.add_transactions(&mut transactions).await?;
        transaction = transactions
            .pop()
            .expect("No transaction found in the vector");
        let dto = transaction.try_into_dto()?;
        Ok(dto)
    }

    pub(crate) async fn update_individual_transaction_inner(
        &self,
        user_id: Uuid,
        transaction_id: Uuid,
        transaction_dto: TransactionDto,
    ) -> anyhow::Result<()> {
        // Step 1: Verify ownership (reuse fetched data)
        let query_params = GetTransactionWithEntriesParams::by_transaction_id(transaction_id);
        let query = transaction_queries::get_transaction_with_entries(query_params);
        let models = self
            .db
            .fetch_all::<TransactionWithEntriesModel>(query)
            .await?;

        if models.is_empty() {
            return Err(anyhow::anyhow!("Transaction not found"));
        }

        if !models.iter().all(|x| x.user_id == user_id) {
            return Err(anyhow::anyhow!("User_id is not the owner of transaction"));
        }

        // Step 2: Build OLD transaction entity from the models we already fetched
        let old_transaction = create_transaction_from_transaction_with_entries_model(models)?;
        let mut old_vec = vec![old_transaction];
        self.transaction_metadata_service
            .load_metadata(&mut old_vec)
            .await?;
        let old_transaction = old_vec.pop().unwrap();

        // Step 3: Build NEW transaction entity from DTO
        let mut new_transaction = create_transaction_from_dto(transaction_dto, user_id)?;
        new_transaction.set_transaction_id(transaction_id);

        // Step 4: Diff and apply
        self.transaction_service
            .update_transaction_info(transaction_id, &old_transaction, &new_transaction)
            .await?;

        let old_entries = old_transaction.get_entries().clone();
        self.entries_service
            .update_transaction_entries(
                transaction_id,
                &old_entries,
                new_transaction.get_entries_mut(),
            )
            .await?;

        self.transaction_metadata_service
            .update_metadata(&old_transaction, &mut new_transaction)
            .await?;

        Ok(())
    }

    pub(crate) async fn delete_transactions_inner(
        &self,
        user_id: Uuid,
        transaction_ids: Vec<Uuid>,
    ) -> anyhow::Result<()> {
        // Verify ownership
        let query_params =
            GetTransactionWithEntriesParams::by_transaction_ids(transaction_ids.clone());
        let query = transaction_queries::get_transaction_with_entries(query_params);
        let models = self
            .db
            .fetch_all::<TransactionWithEntriesModel>(query)
            .await?;

        if !models.iter().all(|x| x.user_id == user_id) {
            return Err(anyhow::anyhow!(
                "User is not the owner of all specified transactions"
            ));
        }

        // Cascade delete in FK order
        let query = transaction_data_queries::delete_descriptions_by_transaction_ids(
            transaction_ids.clone(),
        );
        self.db.execute(query).await?;
        let query =
            transaction_data_queries::delete_dividends_by_transaction_ids(transaction_ids.clone());
        self.db.execute(query).await?;
        self.entries_service
            .delete_entries_by_transaction_ids(&transaction_ids)
            .await?;

        let query = transaction_data_queries::delete_transactions_by_ids(transaction_ids);
        self.db.execute(query).await?;

        Ok(())
    }
}
