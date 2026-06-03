//! Stateless action service used by AI tools (via the user-scoped adapter
//! in `providers::user_action_provider`). Methods take `user_id` explicitly.

use ai::models::action::{
    CreateCustomAssetParams, CreateCustomAssetResult, CreateTransactionGroupParams,
    CreateTransactionGroupResult, CreateTransactionParams, CreateTransactionResult,
    RecordAssetTradeParams, RecordAssetTradeResult, RecordAssetTradeSide,
};
use anyhow::Result;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::{
    dtos::{
        add_custom_asset_dto::AddCustomAssetDto,
        entry_dto::EntryDto,
        transaction_dto::{
            AssetPurchaseMetadataDto, AssetSaleMetadataDto, RegularTransactionMetadataDto,
            TransactionDto, TransactionTypeDto,
        },
    },
    service_collection::{
        asset_service::AssetsService, transaction_group_service::TransactionGroupService,
        transaction_management_service::TransactionManagementService, user_service::UsersService,
    },
};

pub struct AiActionService {
    transaction_service: TransactionManagementService,
    group_service: TransactionGroupService,
    asset_service: AssetsService,
    users_service: UsersService,
}

impl AiActionService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            transaction_service: TransactionManagementService::new(providers),
            group_service: TransactionGroupService::new(providers),
            asset_service: AssetsService::new(providers),
            users_service: UsersService::new(providers),
        }
    }

    pub async fn create_transaction(
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

    pub async fn create_transaction_group(
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

    pub async fn create_custom_asset(
        &self,
        user_id: Uuid,
        params: CreateCustomAssetParams,
    ) -> Result<CreateCustomAssetResult> {
        let dto = AddCustomAssetDto {
            ticker: params.ticker,
            name: params.name,
            asset_type: params.asset_type,
            base_pair_id: params.base_pair_id,
            user_id,
        };

        let asset = self.asset_service.add_custom_asset(dto).await?;

        Ok(CreateCustomAssetResult {
            asset_id: asset.asset_id,
            message: "Custom asset created successfully".to_string(),
        })
    }

    pub async fn record_asset_trade(
        &self,
        user_id: Uuid,
        params: RecordAssetTradeParams,
    ) -> Result<RecordAssetTradeResult> {
        if params.quantity <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Quantity must be positive."));
        }
        if params.total_amount <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Total amount must be positive."));
        }

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        let asset = self.asset_service.get_asset(params.asset_id).await?;

        let currency = match params.currency_asset_id {
            Some(id) => self.asset_service.get_asset(id).await?,
            None => {
                let (_, _, default_asset_id) = self.users_service.get_basic_user(user_id).await?;
                self.asset_service.get_asset(default_asset_id).await?
            }
        };

        if currency.asset_id == asset.asset_id {
            return Err(anyhow::anyhow!(
                "Asset and currency cannot be the same ({}).",
                currency.ticker
            ));
        }

        let account_id = params.account_id;

        let make_entry = |asset_id: i32, qty: Decimal| EntryDto {
            entry_id: None,
            asset_id,
            quantity: qty,
            account_id,
        };

        let (transaction_type, action_word) = match params.side {
            RecordAssetTradeSide::Buy => (
                TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
                    purchase: make_entry(asset.asset_id, params.quantity),
                    sale: make_entry(currency.asset_id, -params.total_amount),
                }),
                "Buy",
            ),
            RecordAssetTradeSide::Sell => (
                TransactionTypeDto::AssetSale(AssetSaleMetadataDto {
                    sale: make_entry(asset.asset_id, -params.quantity),
                    proceeds: make_entry(currency.asset_id, params.total_amount),
                }),
                "Sell",
            ),
        };

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type,
        };

        let result = self
            .transaction_service
            .add_individual_transaction(user_id, dto)
            .await?;

        let transaction_id = result
            .transaction_id
            .ok_or_else(|| anyhow::anyhow!("Transaction was created but no ID was returned"))?;

        Ok(RecordAssetTradeResult {
            transaction_id,
            asset_ticker: asset.ticker,
            currency_ticker: currency.ticker,
            message: format!("{} recorded successfully.", action_word),
        })
    }
}

fn parse_datetime_or_now(date: Option<&str>) -> Result<time::OffsetDateTime> {
    let Some(s) = date else {
        return Ok(time::OffsetDateTime::now_utc());
    };

    if let Ok(dt) = time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339) {
        return Ok(dt);
    }

    let date_format = time::format_description::parse("[year]-[month]-[day]").unwrap();
    let date = time::Date::parse(s, &date_format)?;
    Ok(date.with_time(time::Time::MIDNIGHT).assume_utc())
}
