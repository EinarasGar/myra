//! Stateless action service used by AI tools (via the user-scoped adapter
//! in `providers::user_action_provider`). Methods take `user_id` explicitly.

use ai::models::action::{
    CreateCustomAssetParams, CreateCustomAssetResult, CreateTransactionParams,
    CreateTransactionResult, DeleteTransactionParams, DeleteTransactionResult, DividendKind,
    GroupTransactionsParams, GroupTransactionsResult, RecordAssetSwapParams, RecordAssetSwapResult,
    RecordAssetTradeParams, RecordAssetTradeResult, RecordAssetTradeSide,
    RecordAssetTransferParams, RecordAssetTransferResult, RecordCashTransferParams,
    RecordCashTransferResult, RecordDividendParams, RecordDividendResult, RecordFeeParams,
    RecordFeeResult, RecordTransferParams, RecordTransferResult, TransferDirection, TransferKind,
    UpdateAssetValuationParams, UpdateAssetValuationResult, UpdateTransactionParams,
    UpdateTransactionResult,
};
use anyhow::Result;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::{
    dtos::{
        add_custom_asset_dto::AddCustomAssetDto,
        asset_pair_rate_insert_dto::AssetPairRateInsertDto,
        entry_dto::EntryDto,
        fee_entry_dto::FeeEntryDto,
        fee_entry_types_dto::FeeEntryTypesDto,
        transaction_dto::{
            AccountFeesMetadataDto, AssetBalanceTransferMetadataDto, AssetDividendMetadataDto,
            AssetPurchaseMetadataDto, AssetSaleMetadataDto, AssetTradeMetadataDto,
            AssetTransferInMetadataDto, AssetTransferOutMetadataDto,
            CashBalanceTransferMetadataDto, CashDividendMetadataDto, CashTransferInMetadataDto,
            CashTransferOutMetadataDto, RegularTransactionMetadataDto, TransactionDto,
            TransactionTypeDto,
        },
    },
    service_collection::{
        ai_data_service::type_name, asset_rates_service::AssetRatesService,
        asset_service::AssetsService, transaction_group_service::TransactionGroupService,
        transaction_management_service::TransactionManagementService, user_service::UsersService,
    },
};

pub struct AiActionService {
    transaction_service: TransactionManagementService,
    group_service: TransactionGroupService,
    asset_service: AssetsService,
    users_service: UsersService,
    asset_rates_service: AssetRatesService,
}

impl AiActionService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            transaction_service: TransactionManagementService::new(providers),
            group_service: TransactionGroupService::new(providers),
            asset_service: AssetsService::new(providers),
            users_service: UsersService::new(providers),
            asset_rates_service: AssetRatesService::new(providers),
        }
    }

    async fn insert_transaction(&self, user_id: Uuid, dto: TransactionDto) -> Result<Uuid> {
        self.transaction_service
            .add_individual_transaction(user_id, dto)
            .await?
            .transaction_id
            .ok_or_else(|| anyhow::anyhow!("Transaction was created but no ID was returned"))
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn create_transaction(
        &self,
        user_id: Uuid,
        params: CreateTransactionParams,
    ) -> Result<CreateTransactionResult> {
        let datetime = parse_datetime(&params.date)?;

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

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(CreateTransactionResult {
            transaction_id,
            message: "Transaction created successfully".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn group_transactions(
        &self,
        user_id: Uuid,
        params: GroupTransactionsParams,
    ) -> Result<GroupTransactionsResult> {
        let date = params.date.as_deref().map(parse_datetime).transpose()?;

        let (group_id, transaction_count) = self
            .group_service
            .group_existing_transactions(
                user_id,
                params.transaction_ids,
                params.description,
                params.category_id,
                date,
            )
            .await?;

        Ok(GroupTransactionsResult {
            group_id,
            transaction_count,
            message: "Transactions grouped successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
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

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
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
                let default_asset_id = self
                    .users_service
                    .get_default_asset(user_id)
                    .await?
                    .ok_or_else(|| anyhow::anyhow!("User has no base currency set"))?;
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

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(RecordAssetTradeResult {
            transaction_id,
            asset_ticker: asset.ticker,
            currency_ticker: currency.ticker,
            message: format!("{} recorded successfully.", action_word),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn record_transfer(
        &self,
        user_id: Uuid,
        params: RecordTransferParams,
    ) -> Result<RecordTransferResult> {
        if params.amount <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Amount must be positive."));
        }
        if params.from_account_id == params.to_account_id {
            return Err(anyhow::anyhow!(
                "Source and destination accounts must differ."
            ));
        }

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        let outgoing_change = EntryDto {
            entry_id: None,
            asset_id: params.asset_id,
            quantity: -params.amount,
            account_id: params.from_account_id,
        };
        let incoming_change = EntryDto {
            entry_id: None,
            asset_id: params.asset_id,
            quantity: params.amount,
            account_id: params.to_account_id,
        };

        let transaction_type = match params.kind {
            TransferKind::Cash => {
                TransactionTypeDto::CashBalanceTransfer(CashBalanceTransferMetadataDto {
                    outgoing_change,
                    incoming_change,
                })
            }
            TransferKind::Asset => {
                TransactionTypeDto::AssetBalanceTransfer(AssetBalanceTransferMetadataDto {
                    outgoing_change,
                    incoming_change,
                })
            }
        };

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type,
        };

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(RecordTransferResult {
            transaction_id,
            message: "Transfer recorded successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn record_cash_transfer(
        &self,
        user_id: Uuid,
        params: RecordCashTransferParams,
    ) -> Result<RecordCashTransferResult> {
        if params.amount <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Amount must be positive."));
        }

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        let make_entry = |quantity: Decimal| EntryDto {
            entry_id: None,
            asset_id: params.asset_id,
            quantity,
            account_id: params.account_id,
        };

        let transaction_type = match params.direction {
            TransferDirection::In => {
                TransactionTypeDto::CashTransferIn(CashTransferInMetadataDto {
                    entry: make_entry(params.amount),
                })
            }
            TransferDirection::Out => {
                TransactionTypeDto::CashTransferOut(CashTransferOutMetadataDto {
                    entry: make_entry(-params.amount),
                })
            }
        };

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type,
        };

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(RecordCashTransferResult {
            transaction_id,
            message: "Cash transfer recorded successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn record_asset_transfer(
        &self,
        user_id: Uuid,
        params: RecordAssetTransferParams,
    ) -> Result<RecordAssetTransferResult> {
        if params.quantity <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Quantity must be positive."));
        }

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        let make_entry = |quantity: Decimal| EntryDto {
            entry_id: None,
            asset_id: params.asset_id,
            quantity,
            account_id: params.account_id,
        };

        let transaction_type = match params.direction {
            TransferDirection::In => {
                TransactionTypeDto::AssetTransferIn(AssetTransferInMetadataDto {
                    entry: make_entry(params.quantity),
                })
            }
            TransferDirection::Out => {
                TransactionTypeDto::AssetTransferOut(AssetTransferOutMetadataDto {
                    entry: make_entry(-params.quantity),
                })
            }
        };

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type,
        };

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(RecordAssetTransferResult {
            transaction_id,
            message: "Asset transfer recorded successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn record_asset_swap(
        &self,
        user_id: Uuid,
        params: RecordAssetSwapParams,
    ) -> Result<RecordAssetSwapResult> {
        if params.from_asset_id == params.to_asset_id {
            return Err(anyhow::anyhow!(
                "The two assets in a swap must be different."
            ));
        }
        if params.from_quantity <= Decimal::ZERO || params.to_quantity <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Both swap quantities must be positive."));
        }

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        let outgoing_entry = EntryDto {
            entry_id: None,
            asset_id: params.from_asset_id,
            quantity: -params.from_quantity,
            account_id: params.account_id,
        };
        let incoming_entry = EntryDto {
            entry_id: None,
            asset_id: params.to_asset_id,
            quantity: params.to_quantity,
            account_id: params.account_id,
        };

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type: TransactionTypeDto::AssetTrade(AssetTradeMetadataDto {
                outgoing_entry,
                incoming_entry,
            }),
        };

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(RecordAssetSwapResult {
            transaction_id,
            message: "Asset swap recorded successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn update_asset_valuation(
        &self,
        user_id: Uuid,
        params: UpdateAssetValuationParams,
    ) -> Result<UpdateAssetValuationResult> {
        if params.value <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Value must be positive."));
        }

        if !self
            .asset_service
            .validate_asset_ownership(user_id, params.asset_id)
            .await?
        {
            return Err(anyhow::anyhow!(
                "Only your own custom assets can be revalued."
            ));
        }

        let (currency_id, asset_ticker) = match params.currency_asset_id {
            Some(c) => (
                c,
                self.asset_service.get_asset(params.asset_id).await?.ticker,
            ),
            None => {
                let full = self
                    .asset_service
                    .get_asset_with_metadata(params.asset_id)
                    .await?;
                let currency_id = full.base_asset_id.map(|b| b.0).ok_or_else(|| {
                    anyhow::anyhow!("Asset has no denominating currency; pass currency_asset_id")
                })?;
                (currency_id, full.asset.ticker)
            }
        };

        let pair_id = self
            .asset_service
            .get_asset_pair_id(params.asset_id, currency_id)
            .await?;

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        self.asset_rates_service
            .insert_pair_single(AssetPairRateInsertDto {
                pair_id,
                rate: params.value,
                date: datetime,
            })
            .await?;

        Ok(UpdateAssetValuationResult {
            asset_id: params.asset_id,
            asset_ticker,
            message: "Valuation recorded successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn record_dividend(
        &self,
        user_id: Uuid,
        params: RecordDividendParams,
    ) -> Result<RecordDividendResult> {
        if params.amount <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Amount must be positive."));
        }

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        let (transaction_type, fee_entries) = match params.kind {
            DividendKind::Cash => {
                let currency_id = match params.currency_asset_id {
                    Some(c) => c,
                    None => self
                        .users_service
                        .get_default_asset(user_id)
                        .await?
                        .ok_or_else(|| anyhow::anyhow!("User has no base currency set"))?,
                };

                let entry = EntryDto {
                    entry_id: None,
                    asset_id: currency_id,
                    quantity: params.amount,
                    account_id: params.account_id,
                };

                let fee_entries = params
                    .withholding_amount
                    .filter(|w| *w > Decimal::ZERO)
                    .map(|w| {
                        vec![FeeEntryDto {
                            entry: EntryDto {
                                entry_id: None,
                                asset_id: currency_id,
                                quantity: -w,
                                account_id: params.account_id,
                            },
                            entry_type: FeeEntryTypesDto::WithholdingTax,
                        }]
                    })
                    .unwrap_or_default();

                (
                    TransactionTypeDto::CashDividend(CashDividendMetadataDto {
                        entry,
                        origin_asset_id: params.paying_asset_id,
                    }),
                    fee_entries,
                )
            }
            DividendKind::Asset => {
                if params.withholding_amount.is_some() || params.currency_asset_id.is_some() {
                    return Err(anyhow::anyhow!(
                        "Withholding and currency are only valid for cash dividends."
                    ));
                }
                let entry = EntryDto {
                    entry_id: None,
                    asset_id: params.paying_asset_id,
                    quantity: params.amount,
                    account_id: params.account_id,
                };
                (
                    TransactionTypeDto::AssetDividend(AssetDividendMetadataDto { entry }),
                    vec![],
                )
            }
        };

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries,
            transaction_type,
        };

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(RecordDividendResult {
            transaction_id,
            message: "Dividend recorded successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn record_fee(
        &self,
        user_id: Uuid,
        params: RecordFeeParams,
    ) -> Result<RecordFeeResult> {
        if params.amount <= Decimal::ZERO {
            return Err(anyhow::anyhow!("Amount must be positive."));
        }

        let datetime = parse_datetime_or_now(params.date.as_deref())?;

        let entry = EntryDto {
            entry_id: None,
            asset_id: params.asset_id,
            quantity: -params.amount,
            account_id: params.account_id,
        };

        let dto = TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type: TransactionTypeDto::AccountFees(AccountFeesMetadataDto { entry }),
        };

        let transaction_id = self.insert_transaction(user_id, dto).await?;

        Ok(RecordFeeResult {
            transaction_id,
            message: "Fee recorded successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn update_transaction(
        &self,
        user_id: Uuid,
        params: UpdateTransactionParams,
    ) -> Result<UpdateTransactionResult> {
        let existing = self
            .transaction_service
            .get_individual_transaction(user_id, params.transaction_id)
            .await?;

        let date = params
            .date
            .as_deref()
            .map(parse_datetime)
            .transpose()?
            .unwrap_or(existing.date);

        let new_type = match existing.transaction_type {
            TransactionTypeDto::Regular(meta) => {
                TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                    description: params.description.or(meta.description),
                    entry: EntryDto {
                        entry_id: meta.entry.entry_id,
                        asset_id: meta.entry.asset_id,
                        account_id: meta.entry.account_id,
                        quantity: params.amount.unwrap_or(meta.entry.quantity),
                    },
                    category_id: params.category_id.unwrap_or(meta.category_id),
                })
            }
            other => {
                if params.amount.is_some()
                    || params.description.is_some()
                    || params.category_id.is_some()
                {
                    return Err(anyhow::anyhow!(
                        "This is a {name} transaction, so only its date can be edited here. Description, amount, and category can only be changed on regular transactions. To change anything else on a {name}, delete it and re-record it with the matching tool.",
                        name = type_name(&other)
                    ));
                }
                other
            }
        };

        let new_dto = TransactionDto {
            transaction_id: None,
            date,
            fee_entries: existing.fee_entries,
            transaction_type: new_type,
        };

        self.transaction_service
            .update_individual_transaction(user_id, params.transaction_id, new_dto)
            .await?;

        Ok(UpdateTransactionResult {
            transaction_id: params.transaction_id,
            message: "Transaction updated successfully.".to_string(),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn delete_transaction(
        &self,
        user_id: Uuid,
        params: DeleteTransactionParams,
    ) -> Result<DeleteTransactionResult> {
        self.transaction_service
            .delete_transactions(user_id, vec![params.transaction_id])
            .await?;

        Ok(DeleteTransactionResult {
            message: "Transaction deleted successfully.".to_string(),
        })
    }
}

fn parse_datetime(s: &str) -> Result<time::OffsetDateTime> {
    if let Ok(dt) = time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339) {
        return Ok(dt);
    }

    let date_format =
        time::format_description::parse_borrowed::<2>("[year]-[month]-[day]").unwrap();
    let date = time::Date::parse(s, &date_format)?;
    Ok(date.with_time(time::Time::MIDNIGHT).assume_utc())
}

fn parse_datetime_or_now(date: Option<&str>) -> Result<time::OffsetDateTime> {
    match date {
        Some(s) => parse_datetime(s),
        None => Ok(time::OffsetDateTime::now_utc()),
    }
}
