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
        paging_dto::PagingDto,
        transaction_dto::{RegularTransactionMetadataDto, TransactionDto, TransactionTypeDto},
    },
    service_collection::{
        accounts_service::AccountsService, asset_service::AssetsService,
        transaction_group_service::TransactionGroupService,
        transaction_management_service::TransactionManagementService, user_service::UsersService,
    },
};

const ACCOUNT_TYPE_INVESTMENT: i32 = 3;
const CATEGORY_ID_ASSET_PURCHASE: i32 = 3;
const CATEGORY_ID_ASSET_SALE: i32 = 4;

pub struct AiActionService {
    transaction_service: TransactionManagementService,
    group_service: TransactionGroupService,
    asset_service: AssetsService,
    accounts_service: AccountsService,
    users_service: UsersService,
}

impl AiActionService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            transaction_service: TransactionManagementService::new(providers),
            group_service: TransactionGroupService::new(providers),
            asset_service: AssetsService::new(providers),
            accounts_service: AccountsService::new(providers),
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

        let datetime = parse_date_or_today(params.date.as_deref())?;

        let asset = self
            .lookup_asset_by_ticker(user_id, &params.ticker)
            .await?
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Asset '{}' not found. Use create_custom_asset to add it first.",
                    params.ticker
                )
            })?;

        let (currency_id, currency_ticker) = match &params.currency_ticker {
            Some(ticker) => {
                let asset = self
                    .lookup_asset_by_ticker(user_id, ticker)
                    .await?
                    .ok_or_else(|| anyhow::anyhow!("Currency '{}' not found.", ticker))?;
                (asset.0, asset.1)
            }
            None => {
                let (_, _, default_asset_id) =
                    self.users_service.get_basic_user(user_id).await?;
                let default = self.asset_service.get_asset(default_asset_id).await?;
                (default.asset_id, default.ticker)
            }
        };

        if currency_id == asset.0 {
            return Err(anyhow::anyhow!(
                "Asset and currency cannot be the same ({}).",
                currency_ticker
            ));
        }

        let (account_id, account_name) = self
            .resolve_trade_account(user_id, params.account_id, params.account_name.as_deref())
            .await?;

        let (asset_id, asset_ticker) = asset;

        let (cash_qty, asset_qty, category_id, action_word) = match params.side {
            RecordAssetTradeSide::Buy => (
                -params.total_amount,
                params.quantity,
                CATEGORY_ID_ASSET_PURCHASE,
                "Buy",
            ),
            RecordAssetTradeSide::Sell => (
                params.total_amount,
                -params.quantity,
                CATEGORY_ID_ASSET_SALE,
                "Sell",
            ),
        };

        let description = format!(
            "{} {} {} for {} {}",
            action_word, params.quantity, asset_ticker, params.total_amount, currency_ticker
        );

        let make_dto = |asset_id: i32, qty: Decimal| TransactionDto {
            transaction_id: None,
            date: datetime,
            fee_entries: vec![],
            transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                description: Some(description.clone()),
                entry: EntryDto {
                    entry_id: None,
                    asset_id,
                    quantity: qty,
                    account_id,
                },
                category_id,
            }),
        };
        let transactions = vec![make_dto(currency_id, cash_qty), make_dto(asset_id, asset_qty)];

        let result = self
            .group_service
            .create_transaction_group(user_id, description, category_id, datetime, transactions)
            .await?;

        let group_id = result
            .group_id
            .ok_or_else(|| anyhow::anyhow!("Transaction group created but no ID returned"))?;

        Ok(RecordAssetTradeResult {
            group_id,
            account_used: account_name,
            asset_ticker,
            currency_ticker,
            message: format!("{} recorded successfully.", action_word),
        })
    }

    async fn lookup_asset_by_ticker(
        &self,
        _user_id: Uuid,
        ticker: &str,
    ) -> Result<Option<(i32, String)>> {
        let page = self
            .asset_service
            .search_assets(PagingDto { start: 0, count: 5 }, Some(ticker.to_string()))
            .await?;
        let target = ticker.to_uppercase();
        let hit = page
            .results
            .into_iter()
            .find(|a| a.ticker.to_uppercase() == target);
        Ok(hit.map(|a| (a.id.0, a.ticker)))
    }

    async fn resolve_trade_account(
        &self,
        user_id: Uuid,
        explicit_id: Option<Uuid>,
        explicit_name: Option<&str>,
    ) -> Result<(Uuid, String)> {
        let accounts = self
            .accounts_service
            .get_user_accounts_with_metadata(user_id)
            .await?;

        if let Some(id) = explicit_id {
            let acc = accounts
                .iter()
                .find(|a| a.id == id)
                .ok_or_else(|| anyhow::anyhow!("Account {} not found for user.", id))?;
            return Ok((acc.id, acc.account_name.clone()));
        }

        if let Some(name) = explicit_name {
            let needle = name.to_lowercase();
            let matches: Vec<_> = accounts
                .iter()
                .filter(|a| a.account_name.to_lowercase().contains(&needle))
                .collect();
            return match matches.as_slice() {
                [] => Err(anyhow::anyhow!("No account matching name '{}'.", name)),
                [a] => Ok((a.id, a.account_name.clone())),
                many => Err(anyhow::anyhow!(
                    "Multiple accounts match '{}': {}. Please specify which one.",
                    name,
                    many.iter()
                        .map(|a| a.account_name.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                )),
            };
        }

        let investment: Vec<_> = accounts
            .iter()
            .filter(|a| a.account_type.id == ACCOUNT_TYPE_INVESTMENT)
            .collect();
        match investment.as_slice() {
            [] => Err(anyhow::anyhow!(
                "No investment account found. Please create one (account type 'Investment') before recording asset trades."
            )),
            [a] => Ok((a.id, a.account_name.clone())),
            many => Err(anyhow::anyhow!(
                "Multiple investment accounts found: {}. Please ask the user which one and pass it as account_name or account_id.",
                many.iter()
                    .map(|a| a.account_name.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            )),
        }
    }
}

fn parse_date_or_today(date: Option<&str>) -> Result<time::OffsetDateTime> {
    let format = time::format_description::parse("[year]-[month]-[day]").unwrap();
    let date = match date {
        Some(d) => time::Date::parse(d, &format)?,
        None => time::OffsetDateTime::now_utc().date(),
    };
    Ok(date.with_time(time::Time::MIDNIGHT).assume_utc())
}
