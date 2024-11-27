use std::vec;

use anyhow::Ok;
use anyhow::Result;
#[mockall_double::double]
use dal::database_context::MyraDb;

use dal::{
    models::{base::TotalCount, transaction_models::TransactionWithEntriesModel},
    queries::transaction_queries,
    query_params::get_transaction_with_entries_params::GetTransactionWithEntriesParams,
};
use mockall::automock;

use uuid::Uuid;

use crate::{
    dtos::{
        page_of_results_dto::PageOfResultsDto, paging_dto::PagingDto,
        transaction_dto::TransactionDto,
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
    pub fn new(db: MyraDb) -> Self {
        Self {
            entries_service: EntriesService::new(db.clone()),
            transaction_metadata_service: TransactionMetadataService::new(db.clone()),
            transaction_service: TransactionService::new(db.clone()),
            db,
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
    ) -> anyhow::Result<PageOfResultsDto<TransactionDto>> {
        let query_params =
            GetTransactionWithEntriesParams::by_user_id_paged(user_id, paging.into());

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
        let mut transaction: Transaction = create_transaction_from_dto(transaction, user_id)?;
        let mut transactions = vec![transaction];

        //Maybe a cool thing would be to do something like .in_database_transaction to wrap a method around transaction
        self.add_transactions(&mut transactions).await?;
        transaction = transactions
            .pop()
            .expect("No transaction found in the vector");

        self.db.commit_transaction().await?;

        let dto = transaction.try_into_dto()?;
        Ok(dto)
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
}
