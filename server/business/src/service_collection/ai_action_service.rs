use ai::action_provider::AiActionProvider;
use ai::models::action::{
    CreateTransactionGroupParams, CreateTransactionGroupResult, CreateTransactionParams,
    CreateTransactionResult,
};
use anyhow::Result;
use dal::database_context::MyraDb;
use uuid::Uuid;

use crate::{
    dtos::{
        entry_dto::EntryDto,
        transaction_dto::{RegularTransactionMetadataDto, TransactionDto, TransactionTypeDto},
    },
    service_collection::{
        transaction_group_service::TransactionGroupService,
        transaction_management_service::TransactionManagementService,
    },
};

pub struct AiActionService {
    transaction_service: TransactionManagementService,
    group_service: TransactionGroupService,
}

impl AiActionService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            transaction_service: TransactionManagementService::new(db.clone()),
            group_service: TransactionGroupService::new(db),
        }
    }
}

impl AiActionProvider for AiActionService {
    async fn create_transaction(
        &self,
        user_id: Uuid,
        params: CreateTransactionParams,
    ) -> Result<CreateTransactionResult> {
        let format = time::format_description::parse("[year]-[month]-[day]").unwrap();
        let date = time::Date::parse(&params.date, &format)?;
        let datetime = date.with_time(time::Time::MIDNIGHT).assume_utc();

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                description: Some(params.description),
                entry: EntryDto {
                    entry_id: None,
                    asset_id: params.asset_id,
                    quantity: params.amount,
                    account_id: params.account_id,
                },
                category_id: params.category_id,
            }),
        };

        let result = self
            .transaction_service
            .add_individual_transaction(user_id, dto)
            .await?;

        let transaction_id = result
            .transaction_id
            .ok_or_else(|| anyhow::anyhow!("Transaction was created but no ID was returned"))?;

        Ok(CreateTransactionResult {
            transaction_id,
            message: "Transaction created successfully".to_string(),
        })
    }

    async fn create_transaction_group(
        &self,
        user_id: Uuid,
        params: CreateTransactionGroupParams,
    ) -> Result<CreateTransactionGroupResult> {
        let format = time::format_description::parse("[year]-[month]-[day]").unwrap();
        let date = time::Date::parse(&params.date, &format)?;
        let datetime = date.with_time(time::Time::MIDNIGHT).assume_utc();

        let transaction_dtos: Vec<TransactionDto> = params
            .entries
            .into_iter()
            .map(|e| TransactionDto {
                transaction_id: None,
                date: datetime,
                fee_entries: vec![],
                transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                    description: e.description,
                    entry: EntryDto {
                        entry_id: None,
                        asset_id: e.asset_id,
                        quantity: e.amount,
                        account_id: e.account_id,
                    },
                    category_id: e.category_id.unwrap_or(params.category_id),
                }),
            })
            .collect();

        let result = self
            .group_service
            .create_transaction_group(
                user_id,
                params.description,
                params.category_id,
                datetime,
                transaction_dtos,
            )
            .await?;

        let group_id = result.group_id.ok_or_else(|| {
            anyhow::anyhow!("Transaction group was created but no ID was returned")
        })?;

        Ok(CreateTransactionGroupResult {
            group_id,
            transaction_count: result.transactions.len(),
            message: "Transaction group created successfully".to_string(),
        })
    }
}
