use std::collections::{HashMap, HashSet};

use anyhow::Result;
#[mockall_double::double]
use dal::database_context::MyraDb;

use dal::{
    models::{
        base::TotalCount,
        transaction_models::{
            AddTransactionGroupModel, TransactionGroupModel, TransactionIdWithGroupModel,
            TransactionWithEntriesModel, UpdateTransactionGroupModel,
        },
    },
    queries::{transaction_group_queries, transaction_queries},
    query_params::{
        get_transaction_groups_params::GetTransactionGroupsParams,
        get_transaction_with_entries_params::GetTransactionWithEntriesParams,
    },
};

use time::OffsetDateTime;
use uuid::Uuid;

use crate::dtos::{
    paging_dto::{CursorPageOfResultsDto, PaginationModeDto},
    transaction_dto::TransactionDto,
    transaction_group_dto::TransactionGroupDto,
    validation_error_dto::{BusinessFieldErrorDto, BusinessValidationErrorDto},
};

use crate::entities::transactions::transaction::Transaction;
use crate::entities::transactions::transaction_types::{
    create_transaction_from_dto, create_transactions_from_transaction_with_entries_models,
};

use super::{
    ai_embedding_service::AiEmbeddingService,
    transaction_management_service::TransactionManagementService,
    transaction_metadata_service::TransactionMetadataService,
};

pub struct TransactionGroupService {
    db: MyraDb,
    management_service: TransactionManagementService,
    transaction_metadata_service: TransactionMetadataService,
    embedding_service: AiEmbeddingService,
}

impl TransactionGroupService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            management_service: TransactionManagementService::new(db.clone()),
            transaction_metadata_service: TransactionMetadataService::new(db.clone()),
            embedding_service: AiEmbeddingService::new(db.clone()),
            db,
        }
    }

    pub async fn create_transaction_group(
        &self,
        user_id: Uuid,
        description: String,
        category_id: i32,
        date: OffsetDateTime,
        transaction_dtos: Vec<TransactionDto>,
    ) -> anyhow::Result<TransactionGroupDto> {
        if transaction_dtos.is_empty() {
            return Err(BusinessValidationErrorDto {
                errors: vec![BusinessFieldErrorDto {
                    field: "transactions".to_string(),
                    message: "At least one transaction is required".to_string(),
                }],
            }
            .into());
        }

        self.db.start_transaction().await?;

        // Create all transactions in a single batch
        let mut transactions: Vec<Transaction> = transaction_dtos
            .into_iter()
            .map(|dto| create_transaction_from_dto(dto, user_id))
            .collect::<Result<_>>()?;
        self.management_service
            .add_transactions(&mut transactions)
            .await?;
        let created_ids: Vec<Uuid> = transactions
            .iter()
            .map(|t| {
                t.get_transaction_id()
                    .expect("Created transaction must have an id")
            })
            .collect();

        // Insert group record
        let insert_group_query =
            transaction_group_queries::insert_transaction_group(AddTransactionGroupModel {
                category_id,
                description: description.clone(),
                date_added: date,
            });
        let group_id = self.db.fetch_one_scalar::<Uuid>(insert_group_query).await?;

        // Assign transactions to the group
        let expected_count = created_ids.len();
        let set_group_query =
            transaction_group_queries::set_group_id_on_transactions(group_id, created_ids.clone());
        let affected = self.db.execute_with_rows_affected(set_group_query).await?;
        if affected != expected_count as u64 {
            return Err(BusinessValidationErrorDto {
                errors: vec![BusinessFieldErrorDto {
                    field: "transactions".to_string(),
                    message: "One or more transactions were concurrently assigned to another group"
                        .to_string(),
                }],
            }
            .into());
        }

        self.db.commit_transaction().await?;

        self.embedding_service
            .spawn_embed_group(group_id, description.clone());

        // Fetch back full transactions
        let transaction_dtos = self.fetch_transactions_by_ids(created_ids).await?;

        Ok(TransactionGroupDto {
            group_id: Some(group_id),
            description,
            category_id,
            date,
            transactions: transaction_dtos,
        })
    }

    pub async fn group_individual_transactions(
        &self,
        user_id: Uuid,
        description: String,
        category_id: i32,
        date: OffsetDateTime,
        transaction_dtos: Vec<TransactionDto>,
    ) -> anyhow::Result<TransactionGroupDto> {
        self.db.start_transaction().await?;

        // Create the group record
        let insert_group_query =
            transaction_group_queries::insert_transaction_group(AddTransactionGroupModel {
                category_id,
                description: description.clone(),
                date_added: date,
            });
        let group_id = self.db.fetch_one_scalar::<Uuid>(insert_group_query).await?;

        // Delegate to inner which handles moving existing transactions
        let result = self
            .update_transaction_group_inner(
                user_id,
                group_id,
                description,
                category_id,
                date,
                transaction_dtos,
            )
            .await?;

        self.db.commit_transaction().await?;

        Ok(result)
    }

    pub async fn update_transaction_group(
        &self,
        user_id: Uuid,
        group_id: Uuid,
        description: String,
        category_id: i32,
        date: OffsetDateTime,
        transaction_dtos: Vec<TransactionDto>,
    ) -> anyhow::Result<TransactionGroupDto> {
        self.db.start_transaction().await?;

        let result = self
            .update_transaction_group_inner(
                user_id,
                group_id,
                description,
                category_id,
                date,
                transaction_dtos,
            )
            .await?;

        self.db.commit_transaction().await?;

        Ok(result)
    }

    async fn update_transaction_group_inner(
        &self,
        user_id: Uuid,
        group_id: Uuid,
        description: String,
        category_id: i32,
        date: OffsetDateTime,
        transaction_dtos: Vec<TransactionDto>,
    ) -> anyhow::Result<TransactionGroupDto> {
        if transaction_dtos.is_empty() {
            return Err(BusinessValidationErrorDto {
                errors: vec![BusinessFieldErrorDto {
                    field: "transactions".to_string(),
                    message: "At least one transaction is required".to_string(),
                }],
            }
            .into());
        }

        // Verify group exists
        let group_exists_query =
            transaction_group_queries::get_transaction_groups_by_ids(vec![group_id]);
        let group_exists = self
            .db
            .fetch_optional::<TransactionGroupModel>(group_exists_query)
            .await?;
        if group_exists.is_none() {
            return Err(anyhow::anyhow!("Transaction group not found"));
        }

        // Get current group member IDs
        let current_id_query =
            transaction_group_queries::get_transaction_ids_by_groups(vec![group_id]);
        let current_id_list = self.db.fetch_all_scalar::<Uuid>(current_id_query).await?;
        let current_ids: HashSet<Uuid> = current_id_list.into_iter().collect();

        // Classify incoming transactions
        let mut to_create: Vec<TransactionDto> = Vec::new();
        let mut to_update: Vec<(Uuid, TransactionDto)> = Vec::new();
        let mut to_move_in: Vec<(Uuid, TransactionDto)> = Vec::new();
        let mut incoming_existing_ids: HashSet<Uuid> = HashSet::new();

        for dto in transaction_dtos {
            match dto.transaction_id {
                None => {
                    to_create.push(dto);
                }
                Some(id) if current_ids.contains(&id) => {
                    incoming_existing_ids.insert(id);
                    to_update.push((id, dto));
                }
                Some(id) => {
                    incoming_existing_ids.insert(id);
                    to_move_in.push((id, dto));
                }
            }
        }

        // Compute transactions to delete (current members not referenced by incoming)
        let to_delete: Vec<Uuid> = current_ids
            .iter()
            .filter(|id| !incoming_existing_ids.contains(id))
            .cloned()
            .collect();

        // Delete removed transactions
        if !to_delete.is_empty() {
            self.management_service
                .delete_transactions_inner(user_id, to_delete)
                .await?;
        }

        // Update existing group members
        for (tx_id, dto) in &to_update {
            self.management_service
                .update_individual_transaction_inner(user_id, *tx_id, dto.clone())
                .await?;
        }

        // Move-in and update existing transactions from outside the group
        let mut moved_in_ids: Vec<Uuid> = Vec::new();
        for (tx_id, dto) in &to_move_in {
            self.management_service
                .update_individual_transaction_inner(user_id, *tx_id, dto.clone())
                .await?;
            moved_in_ids.push(*tx_id);
        }

        // Create new transactions in a single batch
        let mut new_ids: Vec<Uuid> = Vec::new();
        if !to_create.is_empty() {
            let mut new_transactions: Vec<Transaction> = to_create
                .into_iter()
                .map(|dto| create_transaction_from_dto(dto, user_id))
                .collect::<Result<_>>()?;
            self.management_service
                .add_transactions(&mut new_transactions)
                .await?;
            new_ids = new_transactions
                .iter()
                .map(|t| {
                    t.get_transaction_id()
                        .expect("Created transaction must have an id")
                })
                .collect();
        }

        // Set group ID on new and moved-in transactions
        let ids_to_assign: Vec<Uuid> = new_ids.iter().chain(moved_in_ids.iter()).cloned().collect();
        if !ids_to_assign.is_empty() {
            let set_query =
                transaction_group_queries::set_group_id_on_transactions(group_id, ids_to_assign);
            self.db.execute(set_query).await?;
        }

        // Update group metadata
        let update_group_query =
            transaction_group_queries::update_transaction_group(UpdateTransactionGroupModel {
                id: group_id,
                category_id,
                description: description.clone(),
                date_added: date,
            });
        self.db.execute(update_group_query).await?;
        self.embedding_service
            .spawn_embed_group(group_id, description.clone());

        // Collect all final transaction IDs and fetch back
        let all_ids: Vec<Uuid> = to_update
            .iter()
            .map(|(id, _)| *id)
            .chain(moved_in_ids.iter().cloned())
            .chain(new_ids.iter().cloned())
            .collect();

        let transaction_results = self.fetch_transactions_by_ids(all_ids).await?;

        Ok(TransactionGroupDto {
            group_id: Some(group_id),
            description,
            category_id,
            date,
            transactions: transaction_results,
        })
    }

    pub async fn delete_transaction_group(
        &self,
        user_id: Uuid,
        group_id: Uuid,
    ) -> anyhow::Result<()> {
        // Fetch group's transaction IDs to verify ownership
        let id_query = transaction_group_queries::get_transaction_ids_by_groups(vec![group_id]);
        let transaction_ids = self.db.fetch_all_scalar::<Uuid>(id_query).await?;

        // Verify group exists
        let group_exists_query =
            transaction_group_queries::get_transaction_groups_by_ids(vec![group_id]);
        let group_exists = self
            .db
            .fetch_optional::<TransactionGroupModel>(group_exists_query)
            .await?;
        if group_exists.is_none() {
            return Err(anyhow::anyhow!("Transaction group not found"));
        }

        if transaction_ids.is_empty() {
            return Err(anyhow::anyhow!(
                "Transaction group has no transactions and cannot verify ownership"
            ));
        }

        let ownership_params = GetTransactionWithEntriesParams::by_transaction_ids(transaction_ids);
        let ownership_query = transaction_queries::get_transaction_with_entries(ownership_params);
        let models = self
            .db
            .fetch_all::<TransactionWithEntriesModel>(ownership_query)
            .await?;

        if !models.iter().all(|x| x.user_id == user_id) {
            return Err(anyhow::anyhow!(
                "User is not the owner of all transactions in the group"
            ));
        }

        self.db.start_transaction().await?;

        // Delete in dependency order: descriptions → entries → transactions → group
        let delete_descriptions_query =
            transaction_group_queries::delete_transaction_descriptions_by_group(group_id);
        self.db.execute(delete_descriptions_query).await?;

        let delete_entries_query =
            transaction_group_queries::delete_transaction_entries_by_group(group_id);
        self.db.execute(delete_entries_query).await?;

        let delete_transactions_query =
            transaction_group_queries::delete_transactions_by_group(group_id);
        self.db.execute(delete_transactions_query).await?;

        let delete_group_query = transaction_group_queries::delete_transaction_group(group_id);
        self.db.execute(delete_group_query).await?;

        self.db.commit_transaction().await?;

        Ok(())
    }

    pub async fn get_transaction_groups(
        &self,
        user_id: Uuid,
        pagination: PaginationModeDto,
        search_query: Option<String>,
    ) -> anyhow::Result<CursorPageOfResultsDto<TransactionGroupDto>> {
        let limit = pagination.page_size();
        let is_offset = matches!(pagination, PaginationModeDto::Offset { .. });

        let params = GetTransactionGroupsParams {
            user_id,
            pagination: pagination.into(),
            search_query,
        };

        let groups_query = transaction_group_queries::get_transaction_groups_for_user(params);

        // For offset mode, fetch with TotalCount wrapper to get total_results
        let (mut group_models, total_results): (Vec<TransactionGroupModel>, Option<i64>) =
            if is_offset {
                let total_count_models = self
                    .db
                    .fetch_all::<TotalCount<TransactionGroupModel>>(groups_query)
                    .await?;
                let total = total_count_models.first().map(|m| m.total_results);
                let models = total_count_models.into_iter().map(|m| m.model).collect();
                (models, total)
            } else {
                let models = self
                    .db
                    .fetch_all::<TransactionGroupModel>(groups_query)
                    .await?;
                (models, None)
            };

        // The DAL returns limit+1 results in cursor mode to signal has_more
        let has_more = group_models.len() as u64 > limit;

        let next_cursor = if has_more {
            group_models.get(limit as usize - 1).map(|m| m.id)
        } else {
            None
        };

        if has_more {
            group_models.truncate(limit as usize);
        }

        // Batch load transactions for all groups in a single query
        let group_ids: Vec<Uuid> = group_models.iter().map(|m| m.id).collect();
        let mut group_tx_map: HashMap<Uuid, Vec<TransactionDto>> = HashMap::new();

        if !group_ids.is_empty() {
            let tx_ids_query = transaction_group_queries::get_transaction_ids_by_groups(group_ids);
            let tx_id_with_groups = self
                .db
                .fetch_all::<TransactionIdWithGroupModel>(tx_ids_query)
                .await?;

            let all_tx_ids: Vec<Uuid> = tx_id_with_groups.iter().map(|m| m.id).collect();

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

                // Build a lookup map: transaction_id -> group_id
                let tx_to_group: HashMap<Uuid, Uuid> = tx_id_with_groups
                    .into_iter()
                    .map(|m| (m.id, m.group_id))
                    .collect();

                // Distribute transactions into per-group buckets
                for tx_dto in tx_dtos {
                    if let Some(tx_id) = tx_dto.transaction_id {
                        if let Some(&gid) = tx_to_group.get(&tx_id) {
                            group_tx_map.entry(gid).or_default().push(tx_dto);
                        }
                    }
                }
            }
        }

        let group_dtos = group_models
            .into_iter()
            .map(|group_model| {
                let transactions = group_tx_map.remove(&group_model.id).unwrap_or_default();
                TransactionGroupDto {
                    group_id: Some(group_model.id),
                    description: group_model.description,
                    category_id: group_model.category_id,
                    date: group_model.date_added,
                    transactions,
                }
            })
            .collect::<Vec<TransactionGroupDto>>();

        Ok(CursorPageOfResultsDto {
            results: group_dtos,
            has_more,
            next_cursor,
            total_results,
        })
    }

    async fn fetch_transactions_by_ids(
        &self,
        ids: Vec<Uuid>,
    ) -> anyhow::Result<Vec<TransactionDto>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }

        let params = GetTransactionWithEntriesParams::by_transaction_ids(ids);
        let query = transaction_queries::get_transaction_with_entries(params);
        let models = self
            .db
            .fetch_all::<TransactionWithEntriesModel>(query)
            .await?;

        let mut transactions = create_transactions_from_transaction_with_entries_models(models)?;
        self.transaction_metadata_service
            .load_metadata(&mut transactions)
            .await?;

        transactions
            .into_iter()
            .map(|t| t.try_into_dto())
            .collect::<Result<Vec<TransactionDto>>>()
    }
}
