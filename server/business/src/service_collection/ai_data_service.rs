//! Stateless data-access service used by AI tools (via the user-scoped
//! adapter in `providers::user_data_provider`). Methods take `user_id`
//! explicitly because `AiDataService` itself is shared across users; the
//! per-user `AiDataProvider` impl lives in the providers module.

use std::collections::{HashMap, HashSet};

use ai::models::account::{AccountIdentifierResult, AccountResult};
use ai::models::aggregate::{AggregateGroupResult, AggregateResult};
use ai::models::reference::{AssetResult, CategoryResult};
use ai::models::search::TransactionSearchResult;
use ai::models::transactions::{
    QueryTransactionsParams, QueryTransactionsResult, TransactionDetailEntry,
    TransactionDetailResult, TransactionRow,
};
use ai::models::wealth::{
    AssetPricePoint, AssetPriceResult, CurrencyRef, HoldingGroup, HoldingRow, HoldingsResult,
    NetWorthHistoryPoint, NetWorthHistoryResult, PortfolioAssetRow, PortfolioCashRow,
    PortfolioOverviewResult, PortfolioOverviewTotals, PortfolioPositionRow,
};
use anyhow::Result;
#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::ai_models::{AiAssetModel, AiCategoryModel, AiTransactionSearchModel};
use dal::queries::{account_identifier_queries, ai_queries};
use dal::query_params::ai_search_params;
use pgvector::Vector;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::dtos::asset_rate_dto::AssetRateDto;
use crate::dtos::assets::asset_dto::AssetDto;
use crate::dtos::assets::asset_id_dto::AssetIdDto;
use crate::dtos::assets::asset_pair_ids_dto::AssetPairIdsDto;
use crate::dtos::entry_dto::EntryDto;
use crate::dtos::fee_entry_types_dto::FeeEntryTypesDto;
use crate::dtos::individual_transaction_filters_dto::IndividualTransactionFiltersDto;
use crate::dtos::net_worth::range_dto::RangeDto;
use crate::dtos::paging_dto::PaginationModeDto;
use crate::dtos::portfolio::overview::asset_overview_dto::PortfolioAssetOverviewDto;
use crate::dtos::portfolio::overview::cash_overview_dto::PortfolioCashOverviewDto;
use crate::dtos::portfolio::overview::PortfolioOverviewType;
use crate::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};

use super::accounts_service::AccountsService;
use super::asset_rates_service::AssetRatesService;
use super::asset_service::AssetsService;
use super::category_service::CategoryService;
use super::portfolio_overview_service::PortfolioOverviewService;
use super::portfolio_service::PortfolioService;
use super::transaction_management_service::TransactionManagementService;
use super::user_service::UsersService;

pub struct AiDataService {
    db: MyraDb,
    portfolio_overview_service: PortfolioOverviewService,
    portfolio_service: PortfolioService,
    asset_rates_service: AssetRatesService,
    accounts_service: AccountsService,
    assets_service: AssetsService,
    category_service: CategoryService,
    users_service: UsersService,
    transaction_service: TransactionManagementService,
}

impl AiDataService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
            portfolio_overview_service: PortfolioOverviewService::new(providers),
            portfolio_service: PortfolioService::new(providers),
            asset_rates_service: AssetRatesService::new(providers),
            accounts_service: AccountsService::new(providers),
            assets_service: AssetsService::new(providers),
            category_service: CategoryService::new(providers),
            users_service: UsersService::new(providers),
            transaction_service: TransactionManagementService::new(providers),
        }
    }

    async fn resolve_reference_asset(
        &self,
        user_id: Uuid,
        reference_asset_id: Option<i32>,
    ) -> Result<i32> {
        match reference_asset_id {
            Some(id) => Ok(id),
            None => self
                .users_service
                .get_default_asset(user_id)
                .await?
                .ok_or_else(|| anyhow::anyhow!("User has no base currency set")),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, limit))]
    pub async fn search_transactions_by_text(
        &self,
        user_id: Uuid,
        query: &str,
        date_from: Option<&str>,
        date_to: Option<&str>,
        account_ids: Option<Vec<Uuid>>,
        limit: i64,
    ) -> Result<Vec<TransactionSearchResult>> {
        let dal_params = ai_search_params::SearchTransactionsParams {
            user_id,
            query: query.to_string(),
            date_from: date_from.map(str::to_string),
            date_to: date_to.map(str::to_string),
            account_ids,
            limit,
        };
        let q = ai_queries::search_transactions_by_description(&dal_params);
        let rows = self.db.fetch_all::<AiTransactionSearchModel>(q).await?;
        Ok(rows.into_iter().map(to_search_result).collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, limit))]
    pub async fn search_transactions_by_vector(
        &self,
        user_id: Uuid,
        query_vector: Vec<f64>,
        date_from: Option<&str>,
        date_to: Option<&str>,
        account_ids: Option<Vec<Uuid>>,
        limit: i64,
    ) -> Result<Vec<TransactionSearchResult>> {
        let vector = Vector::from(query_vector.iter().map(|&x| x as f32).collect::<Vec<f32>>());
        let q = ai_queries::search_transactions_by_embedding(
            user_id,
            vector,
            date_from,
            date_to,
            account_ids,
            limit,
        );
        let rows = self.db.fetch_all::<AiTransactionSearchModel>(q).await?;
        Ok(rows.into_iter().map(to_search_result).collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn aggregate_transactions(
        &self,
        user_id: Uuid,
        group_by: &str,
        date_from: Option<&str>,
        date_to: Option<&str>,
        description_filter: Option<&str>,
        account_id: Option<Uuid>,
        currency_asset_id: Option<i32>,
        limit: i64,
    ) -> Result<AggregateResult> {
        let currency_id = self
            .resolve_reference_asset(user_id, currency_asset_id)
            .await?;
        let dal_params = ai_search_params::AggregateTransactionsParams {
            user_id,
            group_by: group_by.to_string(),
            date_from: date_from.map(str::to_string),
            date_to: date_to.map(str::to_string),
            description_filter: description_filter.map(str::to_string),
            account_id,
            currency_asset_id: Some(currency_id),
            limit: limit + 1,
        };
        let q = ai_queries::aggregate_transactions(&dal_params);
        let mut rows = self
            .db
            .fetch_all::<(String, rust_decimal::Decimal, i64)>(q)
            .await?;
        let has_more = rows.len() as i64 > limit;
        rows.truncate(limit as usize);
        let groups = rows
            .into_iter()
            .map(|(name, amount, count)| AggregateGroupResult {
                group_name: name,
                total_amount: amount,
                transaction_count: count,
            })
            .collect();
        let currency = self.assets_service.get_asset(currency_id).await?.ticker;
        Ok(AggregateResult {
            currency,
            groups,
            has_more,
            note: None,
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn list_accounts(&self, user_id: Uuid) -> Result<Vec<AccountResult>> {
        let dal_params = ai_search_params::ListAccountsParams { user_id };
        let q = ai_queries::get_active_accounts(&dal_params);
        let rows = self
            .db
            .fetch_all::<dal::models::ai_models::AiAccountModel>(q)
            .await?;

        let ids: Vec<Uuid> = rows.iter().map(|r| r.account_id).collect();
        let mut by_account: HashMap<Uuid, Vec<AccountIdentifierResult>> = HashMap::new();
        if !ids.is_empty() {
            let id_rows = self
                .db
                .fetch_all::<dal::models::account_models::AccountIdentifierRow>(
                    account_identifier_queries::get_identifiers_for_accounts(ids),
                )
                .await?;
            for r in id_rows {
                by_account
                    .entry(r.account_id)
                    .or_default()
                    .push(AccountIdentifierResult {
                        kind: r.kind,
                        value: r.value,
                    });
            }
        }

        Ok(rows
            .into_iter()
            .map(|r| AccountResult {
                identifiers: by_account.remove(&r.account_id).unwrap_or_default(),
                account_id: r.account_id,
                account_name: r.account_name,
                account_type: r.account_type,
                liquidity_type: r.liquidity_type,
                ownership_share: r.ownership_share,
            })
            .collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn search_categories(
        &self,
        user_id: Uuid,
        query_vector: Option<Vec<f64>>,
    ) -> Result<Vec<CategoryResult>> {
        let embedding =
            query_vector.map(|qv| Vector::from(qv.iter().map(|&x| x as f32).collect::<Vec<f32>>()));
        let params = ai_search_params::SearchCategoriesParams {
            user_id,
            limit: embedding.as_ref().map(|_| 20_i64),
            embedding,
        };
        let rows = self
            .db
            .fetch_all::<AiCategoryModel>(ai_queries::search_categories(&params))
            .await?;
        Ok(rows.into_iter().map(to_category_result).collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn search_assets(
        &self,
        user_id: Uuid,
        query: Option<&str>,
        query_vector: Option<Vec<f64>>,
    ) -> Result<Vec<AssetResult>> {
        let embedding =
            query_vector.map(|qv| Vector::from(qv.iter().map(|&x| x as f32).collect::<Vec<f32>>()));
        let params = ai_search_params::SearchAssetsParams {
            user_id,
            query: query.map(|s| s.to_string()),
            limit: embedding.as_ref().map(|_| 20_i64),
            embedding,
        };
        let rows = self
            .db
            .fetch_all::<AiAssetModel>(ai_queries::search_assets(&params))
            .await?;
        Ok(rows.into_iter().map(to_asset_result).collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_holdings(
        &self,
        user_id: Uuid,
        account_id: Option<Uuid>,
        asset_id: Option<i32>,
        group_by: Option<String>,
        summary: bool,
        reference_asset_id: Option<i32>,
    ) -> Result<HoldingsResult> {
        let ref_id = self
            .resolve_reference_asset(user_id, reference_asset_id)
            .await?;

        let mut holdings = self
            .portfolio_overview_service
            .get_holdings(user_id, true)
            .await?;
        if let Some(a) = account_id {
            holdings.retain(|h| h.account_id == a);
        }
        if let Some(aid) = asset_id {
            holdings.retain(|h| h.asset_id == aid);
        }

        let asset_id_set: HashSet<i32> = holdings.iter().map(|h| h.asset_id).collect();
        let rate_asset_ids: HashSet<AssetIdDto> =
            asset_id_set.iter().map(|id| AssetIdDto(*id)).collect();
        let rates = self
            .asset_rates_service
            .get_pairs_latest_converted(rate_asset_ids, AssetIdDto(ref_id))
            .await?;

        let asset_map = self.asset_map(asset_id_set.clone()).await?;
        let non_currency_ids: HashSet<i32> = asset_id_set
            .iter()
            .filter(|id| asset_map.get(id).is_none_or(|a| a.asset_type.id != 1))
            .copied()
            .collect();
        let base_pairs = if non_currency_ids.is_empty() {
            HashMap::new()
        } else {
            self.assets_service
                .get_assets_base_pairs(non_currency_ids)
                .await?
        };
        let currency_ids: HashSet<i32> = base_pairs.values().copied().collect();
        let currency_tickers: HashMap<i32, String> = if currency_ids.is_empty() {
            HashMap::new()
        } else {
            self.assets_service
                .get_assets(currency_ids)
                .await?
                .into_iter()
                .map(|a| (a.id.0, a.ticker))
                .collect()
        };
        let account_ids: HashSet<Uuid> = holdings.iter().map(|h| h.account_id).collect();
        let account_names = self.account_name_map(account_ids).await?;

        let mut total_value = Decimal::ZERO;
        let mut unvalued: HashSet<i32> = HashSet::new();
        let mut rows: Vec<HoldingRow> = Vec::with_capacity(holdings.len());
        for h in &holdings {
            let key = AssetPairIdsDto::new(AssetIdDto(h.asset_id), AssetIdDto(ref_id));
            let value = rates.get(&key).map(|r| h.units * r.rate);
            match value {
                Some(v) => total_value += v,
                None => {
                    unvalued.insert(h.asset_id);
                }
            }
            let asset = asset_map.get(&h.asset_id);
            let denominating_currency = base_pairs
                .get(&h.asset_id)
                .and_then(|cid| currency_tickers.get(cid).cloned());
            rows.push(HoldingRow {
                asset_id: h.asset_id,
                asset_name: asset.map(|a| a.name.clone()).unwrap_or_default(),
                ticker: asset.map(|a| a.ticker.clone()),
                asset_type: asset.map(|a| a.asset_type.name.clone()).unwrap_or_default(),
                denominating_currency,
                account_id: h.account_id,
                account_name: account_names
                    .get(&h.account_id)
                    .cloned()
                    .unwrap_or_default(),
                units: h.units,
                value,
            });
        }

        let groups = group_by.as_deref().map(|gb| {
            let mut buckets: HashMap<String, Decimal> = HashMap::new();
            for row in &rows {
                let key = match gb {
                    "asset" => row.ticker.clone().unwrap_or_else(|| row.asset_name.clone()),
                    "account" => row.account_name.clone(),
                    "asset_type" => row.asset_type.clone(),
                    "currency" => row
                        .denominating_currency
                        .clone()
                        .unwrap_or_else(|| "Unknown".to_string()),
                    _ => continue,
                };
                if let Some(v) = row.value {
                    *buckets.entry(key).or_default() += v;
                }
            }
            let mut group_rows: Vec<HoldingGroup> = buckets
                .into_iter()
                .map(|(key, value)| HoldingGroup {
                    share_pct: if total_value != Decimal::ZERO {
                        value / total_value * dec!(100)
                    } else {
                        Decimal::ZERO
                    },
                    key,
                    value,
                })
                .collect();
            group_rows.sort_by(|a, b| b.value.cmp(&a.value));
            group_rows
        });

        let unvalued_assets: Vec<String> = unvalued
            .iter()
            .filter_map(|id| asset_map.get(id).map(|a| a.name.clone()))
            .collect();

        let ref_asset = self.assets_service.get_asset(ref_id).await?;

        Ok(HoldingsResult {
            reference_currency: CurrencyRef {
                asset_id: ref_id,
                code: ref_asset.ticker,
            },
            total_value,
            holdings: if summary { Vec::new() } else { rows },
            groups,
            unvalued_assets,
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_portfolio_overview(
        &self,
        user_id: Uuid,
        account_id: Option<Uuid>,
        asset_id: Option<i32>,
        include_positions: bool,
        reference_asset_id: Option<i32>,
    ) -> Result<PortfolioOverviewResult> {
        let ref_id = self
            .resolve_reference_asset(user_id, reference_asset_id)
            .await?;
        let dto = self
            .portfolio_overview_service
            .get_portfolio_overview(AssetIdDto(ref_id), user_id, account_id)
            .await?;

        let mut asset_overviews: Vec<PortfolioAssetOverviewDto> = Vec::new();
        let mut cash_overviews: Vec<PortfolioCashOverviewDto> = Vec::new();
        for portfolio in dto.portfolios {
            match portfolio {
                PortfolioOverviewType::Asset(a) => {
                    if asset_id.is_none_or(|aid| a.asset_id == aid) {
                        asset_overviews.push(a);
                    }
                }
                PortfolioOverviewType::Cash(c) => {
                    if asset_id.is_none() {
                        cash_overviews.push(c);
                    }
                }
            }
        }

        let effective_positions = include_positions || asset_id.is_some();

        let mut asset_id_set: HashSet<i32> = HashSet::new();
        let mut account_id_set: HashSet<Uuid> = HashSet::new();
        for a in &asset_overviews {
            asset_id_set.insert(a.asset_id);
            account_id_set.insert(a.account_id);
        }
        for c in &cash_overviews {
            asset_id_set.insert(c.asset_id);
            account_id_set.insert(c.account_id);
        }

        let asset_map = self.asset_map(asset_id_set).await?;
        let account_names = self.account_name_map(account_id_set).await?;

        let mut totals = PortfolioOverviewTotals {
            market_value: Decimal::ZERO,
            total_cost_basis: Decimal::ZERO,
            realized_gains: Decimal::ZERO,
            unrealized_gains: Decimal::ZERO,
            total_gains: Decimal::ZERO,
            total_fees: Decimal::ZERO,
            cash_dividends: Decimal::ZERO,
        };
        let mut assets: Vec<PortfolioAssetRow> = Vec::with_capacity(asset_overviews.len());
        for a in asset_overviews {
            totals.market_value += a.market_value;
            totals.total_cost_basis += a.total_cost_basis;
            totals.realized_gains += a.realized_gains;
            totals.unrealized_gains += a.unrealized_gains;
            totals.total_gains += a.total_gains;
            totals.total_fees += a.total_fees;
            totals.cash_dividends += a.cash_dividends;

            let asset = asset_map.get(&a.asset_id);
            let positions = if effective_positions {
                Some(
                    a.positions
                        .iter()
                        .map(|p| PortfolioPositionRow {
                            add_date: format_rfc3339(p.add_date),
                            add_price: p.add_price,
                            quantity_added: p.quantity_added,
                            amount_sold: p.amount_sold,
                            amount_left: p.amount_left,
                            fees: p.fees,
                            total_cost_basis: p.total_cost_basis,
                            realized_gains: p.realized_gains,
                            unrealized_gains: p.unrealized_gains,
                            total_gains: p.total_gains,
                            is_dividend: p.is_dividend,
                        })
                        .collect(),
                )
            } else {
                None
            };

            assets.push(PortfolioAssetRow {
                asset_id: a.asset_id,
                asset_name: asset.map(|x| x.name.clone()).unwrap_or_default(),
                ticker: asset.map(|x| x.ticker.clone()),
                account_id: a.account_id,
                account_name: account_names
                    .get(&a.account_id)
                    .cloned()
                    .unwrap_or_default(),
                total_units: a.total_units,
                remaining_units: a.remaining_units,
                unit_cost_basis: a.unit_cost_basis,
                total_cost_basis: a.total_cost_basis,
                market_value: a.market_value,
                realized_gains: a.realized_gains,
                unrealized_gains: a.unrealized_gains,
                total_gains: a.total_gains,
                total_fees: a.total_fees,
                cash_dividends: a.cash_dividends,
                positions,
            });
        }

        let cash: Vec<PortfolioCashRow> = cash_overviews
            .into_iter()
            .map(|c| PortfolioCashRow {
                currency: asset_map
                    .get(&c.asset_id)
                    .map(|x| x.ticker.clone())
                    .unwrap_or_default(),
                account_id: c.account_id,
                account_name: account_names
                    .get(&c.account_id)
                    .cloned()
                    .unwrap_or_default(),
                cash_balance: c.units,
                fees: c.fees,
                dividends: c.dividends,
            })
            .collect();

        let ref_asset = self.assets_service.get_asset(ref_id).await?;

        Ok(PortfolioOverviewResult {
            reference_currency: CurrencyRef {
                asset_id: ref_id,
                code: ref_asset.ticker,
            },
            totals,
            assets,
            cash,
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_net_worth_history(
        &self,
        user_id: Uuid,
        range: String,
        account_id: Option<Uuid>,
        reference_asset_id: Option<i32>,
    ) -> Result<NetWorthHistoryResult> {
        let ref_id = self
            .resolve_reference_asset(user_id, reference_asset_id)
            .await?;
        let history = self
            .portfolio_service
            .get_full_portfolio_history(
                user_id,
                AssetIdDto(ref_id),
                RangeDto::StringBased(range.clone()),
                account_id,
            )
            .await?;

        let start_value = history.first().map(|p| p.rate).unwrap_or(Decimal::ZERO);
        let end_value = history.last().map(|p| p.rate).unwrap_or(Decimal::ZERO);
        let change = end_value - start_value;
        let change_pct = if start_value != Decimal::ZERO {
            Some(change / start_value * dec!(100))
        } else {
            None
        };

        let points = downsample(history, 60)
            .into_iter()
            .map(|p| NetWorthHistoryPoint {
                date: format_rfc3339(p.date),
                value: p.rate,
            })
            .collect();

        let ref_asset = self.assets_service.get_asset(ref_id).await?;

        Ok(NetWorthHistoryResult {
            reference_currency: CurrencyRef {
                asset_id: ref_id,
                code: ref_asset.ticker,
            },
            range,
            start_value,
            end_value,
            change,
            change_pct,
            points,
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_asset_price(
        &self,
        user_id: Uuid,
        asset_id: i32,
        quote_asset_id: Option<i32>,
        range: Option<String>,
        date_from: Option<String>,
        date_to: Option<String>,
    ) -> Result<AssetPriceResult> {
        let quote_id = self
            .resolve_reference_asset(user_id, quote_asset_id)
            .await?;

        let mut access_ids = vec![asset_id];
        if quote_asset_id.is_some() {
            access_ids.push(quote_id);
        }
        self.assets_service
            .check_assets_access(user_id, access_ids)
            .await?;

        let asset = self.assets_service.get_asset(asset_id).await?;
        let quote = self.assets_service.get_asset(quote_id).await?;
        let quote_currency = CurrencyRef {
            asset_id: quote_id,
            code: quote.ticker,
        };

        let wants_series = range.is_some() || date_from.is_some() || date_to.is_some();

        if !wants_series {
            let mut asset_ids = HashSet::new();
            asset_ids.insert(AssetIdDto(asset_id));
            let rates = self
                .asset_rates_service
                .get_pairs_latest_converted(asset_ids, AssetIdDto(quote_id))
                .await?;
            let rate = rates
                .get(&AssetPairIdsDto::new(
                    AssetIdDto(asset_id),
                    AssetIdDto(quote_id),
                ))
                .ok_or_else(|| {
                    anyhow::anyhow!("No price available for this asset in the requested currency")
                })?;
            return Ok(AssetPriceResult {
                asset_id,
                asset_name: asset.name,
                ticker: Some(asset.ticker),
                quote_currency,
                price: Some(rate.rate),
                as_of: Some(format_rfc3339(rate.date)),
                points: None,
            });
        }

        let range_dto = if let Some(r) = range {
            RangeDto::StringBased(r)
        } else {
            let from = date_from.as_deref().map(parse_datetime).transpose()?;
            let to = date_to.as_deref().map(parse_datetime_upper).transpose()?;
            let from = from.or_else(|| to.map(|t| t - time::Duration::days(365 * 5)));
            RangeDto::Custom(from, to, None)
        };

        let pair = AssetPairIdsDto::new(AssetIdDto(asset_id), AssetIdDto(quote_id));
        let mut rates = self
            .asset_rates_service
            .get_market_pair_rates_by_range(pair, range_dto.clone())
            .await?;

        if rates.is_empty() && asset_id != quote_id {
            let base_id = self
                .assets_service
                .get_asset_with_metadata(asset_id)
                .await?
                .base_asset_id
                .map(|b| b.0);
            if let Some(base_id) = base_id {
                if base_id != quote_id && base_id != asset_id {
                    let base_pair = AssetPairIdsDto::new(AssetIdDto(asset_id), AssetIdDto(base_id));
                    let base_series = self
                        .asset_rates_service
                        .get_market_pair_rates_by_range(base_pair, range_dto)
                        .await?;
                    if !base_series.is_empty() {
                        let mut set = HashSet::new();
                        set.insert(AssetIdDto(base_id));
                        let conv = self
                            .asset_rates_service
                            .get_pairs_latest_converted(set, AssetIdDto(quote_id))
                            .await?;
                        if let Some(c) = conv.get(&AssetPairIdsDto::new(
                            AssetIdDto(base_id),
                            AssetIdDto(quote_id),
                        )) {
                            let factor = c.rate;
                            rates = base_series
                                .into_iter()
                                .map(|r| AssetRateDto {
                                    rate: r.rate * factor,
                                    date: r.date,
                                })
                                .collect();
                        }
                    }
                }
            }
        }

        let points = downsample(rates, 60)
            .into_iter()
            .map(|r| AssetPricePoint {
                date: format_rfc3339(r.date),
                price: r.rate,
            })
            .collect();

        Ok(AssetPriceResult {
            asset_id,
            asset_name: asset.name,
            ticker: Some(asset.ticker),
            quote_currency,
            price: None,
            as_of: None,
            points: Some(points),
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn query_transactions(
        &self,
        user_id: Uuid,
        params: QueryTransactionsParams,
        query_vector: Option<Vec<f64>>,
    ) -> Result<QueryTransactionsResult> {
        let type_ids = params.transaction_types.as_ref().map(|types| {
            types
                .iter()
                .filter_map(|t| transaction_type_name_to_id(t))
                .collect::<Vec<i32>>()
        });
        let date_from = params
            .date_from
            .as_deref()
            .map(parse_datetime)
            .transpose()?;
        let date_to = params
            .date_to
            .as_deref()
            .map(parse_datetime_upper)
            .transpose()?;
        let limit = params.limit.clamp(1, 50_000);

        let (dtos, has_more, next_cursor) = if let Some(query) = params.query.as_deref() {
            let account_ids = params.account_id.map(|a| vec![a]);
            let text = self
                .search_transactions_by_text(
                    user_id,
                    query,
                    params.date_from.as_deref(),
                    params.date_to.as_deref(),
                    account_ids.clone(),
                    limit * 3,
                )
                .await
                .unwrap_or_default();
            let vector = match query_vector {
                Some(qv) => self
                    .search_transactions_by_vector(
                        user_id,
                        qv,
                        params.date_from.as_deref(),
                        params.date_to.as_deref(),
                        account_ids,
                        limit * 3,
                    )
                    .await
                    .unwrap_or_default(),
                None => Vec::new(),
            };

            let mut seen: HashSet<Uuid> = HashSet::new();
            let mut ranked: Vec<Uuid> = Vec::new();
            for r in text.into_iter().chain(vector.into_iter()) {
                if seen.insert(r.transaction_id) {
                    ranked.push(r.transaction_id);
                }
            }

            let mut dtos = self
                .transaction_service
                .get_transactions_by_ids(user_id, ranked.clone())
                .await?;
            let order: HashMap<Uuid, usize> =
                ranked.iter().enumerate().map(|(i, id)| (*id, i)).collect();
            dtos.sort_by_key(|d| {
                d.transaction_id
                    .and_then(|id| order.get(&id).copied())
                    .unwrap_or(usize::MAX)
            });

            let filtered: Vec<TransactionDto> = dtos
                .into_iter()
                .filter(|d| {
                    type_ids
                        .as_ref()
                        .is_none_or(|ids| ids.contains(&transaction_type_id(&d.transaction_type)))
                })
                .take(limit as usize)
                .collect();

            (filtered, false, None)
        } else {
            let pagination = match params.cursor {
                Some(cursor_id) => PaginationModeDto::Cursor {
                    cursor_id,
                    limit: limit as u64,
                },
                None => PaginationModeDto::CursorFirstPage {
                    limit: limit as u64,
                },
            };
            let page = self
                .transaction_service
                .search_individual_transactions(
                    user_id,
                    pagination,
                    IndividualTransactionFiltersDto {
                        account_id: params.account_id,
                        transaction_type_ids: type_ids,
                        date_from,
                        date_to,
                        ..Default::default()
                    },
                )
                .await?;
            (page.results, page.has_more, page.next_cursor)
        };

        let transactions = self.map_transaction_rows(&dtos).await?;
        Ok(QueryTransactionsResult {
            transactions,
            has_more,
            next_cursor,
            note: None,
        })
    }

    async fn map_transaction_rows(&self, dtos: &[TransactionDto]) -> Result<Vec<TransactionRow>> {
        let legs: Vec<_> = dtos.iter().map(primary_leg).collect();
        let asset_ids: HashSet<i32> = legs.iter().map(|l| l.1).collect();
        let account_ids: HashSet<Uuid> = legs.iter().map(|l| l.2).collect();

        let asset_tickers = self.asset_ticker_map(asset_ids).await?;
        let account_names = self.account_name_map(account_ids).await?;

        Ok(dtos
            .iter()
            .zip(legs)
            .map(
                |(t, (amount, asset_id, account_id, description))| TransactionRow {
                    transaction_id: t.transaction_id.unwrap_or_default(),
                    date: format_rfc3339(t.date),
                    transaction_type: type_name(&t.transaction_type).to_string(),
                    description,
                    amount,
                    unit: asset_tickers.get(&asset_id).cloned().unwrap_or_default(),
                    account: account_names.get(&account_id).cloned().unwrap_or_default(),
                },
            )
            .collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_transaction_detail(
        &self,
        user_id: Uuid,
        transaction_id: Uuid,
    ) -> Result<TransactionDetailResult> {
        let dto = self
            .transaction_service
            .get_individual_transaction(user_id, transaction_id)
            .await?;

        let legs = transaction_legs(&dto.transaction_type);

        let mut asset_ids: HashSet<i32> = HashSet::new();
        let mut account_ids: HashSet<Uuid> = HashSet::new();
        let mut category_ids: HashSet<i32> = HashSet::new();
        for (entry, category_id) in &legs {
            asset_ids.insert(entry.asset_id);
            account_ids.insert(entry.account_id);
            if let Some(cid) = category_id {
                category_ids.insert(*cid);
            }
        }
        for fee in &dto.fee_entries {
            asset_ids.insert(fee.entry.asset_id);
            account_ids.insert(fee.entry.account_id);
        }

        let asset_tickers = self.asset_ticker_map(asset_ids).await?;
        let account_names = self.account_name_map(account_ids).await?;
        let category_names: HashMap<i32, String> = self
            .category_service
            .get_categories(category_ids)
            .await?
            .into_iter()
            .map(|c| (c.id, c.category))
            .collect();

        let mut entries: Vec<TransactionDetailEntry> =
            Vec::with_capacity(legs.len() + dto.fee_entries.len());
        for (entry, category_id) in legs {
            entries.push(TransactionDetailEntry {
                amount: entry.quantity,
                asset_id: entry.asset_id,
                asset: asset_tickers
                    .get(&entry.asset_id)
                    .cloned()
                    .unwrap_or_default(),
                account_id: entry.account_id,
                account: account_names
                    .get(&entry.account_id)
                    .cloned()
                    .unwrap_or_default(),
                category: category_id.and_then(|cid| category_names.get(&cid).cloned()),
                is_fee: false,
                fee_type: None,
            });
        }
        for fee in &dto.fee_entries {
            entries.push(TransactionDetailEntry {
                amount: fee.entry.quantity,
                asset_id: fee.entry.asset_id,
                asset: asset_tickers
                    .get(&fee.entry.asset_id)
                    .cloned()
                    .unwrap_or_default(),
                account_id: fee.entry.account_id,
                account: account_names
                    .get(&fee.entry.account_id)
                    .cloned()
                    .unwrap_or_default(),
                category: None,
                is_fee: true,
                fee_type: Some(fee_type_name(&fee.entry_type).to_string()),
            });
        }

        let description = match &dto.transaction_type {
            TransactionTypeDto::Regular(r) => r.description.clone(),
            _ => None,
        };

        Ok(TransactionDetailResult {
            transaction_id,
            transaction_type: type_name(&dto.transaction_type).to_string(),
            date: format_rfc3339(dto.date),
            description,
            entries,
        })
    }

    async fn asset_map(&self, ids: HashSet<i32>) -> Result<HashMap<i32, AssetDto>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        Ok(self
            .assets_service
            .get_assets(ids)
            .await?
            .into_iter()
            .map(|a| (a.id.0, a))
            .collect())
    }

    async fn asset_ticker_map(&self, ids: HashSet<i32>) -> Result<HashMap<i32, String>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        Ok(self
            .assets_service
            .get_assets(ids)
            .await?
            .into_iter()
            .map(|a| (a.id.0, a.ticker))
            .collect())
    }

    async fn account_name_map(&self, ids: HashSet<Uuid>) -> Result<HashMap<Uuid, String>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        Ok(self
            .accounts_service
            .get_accounts(ids)
            .await?
            .into_iter()
            .map(|a| (a.id, a.account_name))
            .collect())
    }
}

fn transaction_type_name_to_id(name: &str) -> Option<i32> {
    match name.to_lowercase().as_str() {
        "regular" => Some(1),
        "cash_transfer_out" => Some(2),
        "cash_transfer_in" => Some(3),
        "cash_dividend" => Some(4),
        "asset_transfer_out" => Some(5),
        "asset_transfer_in" => Some(6),
        "asset_trade" => Some(7),
        "asset_sale" => Some(8),
        "asset_purchase" => Some(9),
        "asset_dividend" => Some(10),
        "asset_balance_transfer" => Some(11),
        "account_fees" => Some(12),
        "cash_balance_transfer" => Some(13),
        _ => None,
    }
}

pub(crate) fn type_name(t: &TransactionTypeDto) -> &'static str {
    match t {
        TransactionTypeDto::Regular(_) => "Regular",
        TransactionTypeDto::AssetPurchase(_) => "Asset Purchase",
        TransactionTypeDto::AssetSale(_) => "Asset Sale",
        TransactionTypeDto::CashTransferIn(_) => "Cash Transfer In",
        TransactionTypeDto::CashTransferOut(_) => "Cash Transfer Out",
        TransactionTypeDto::CashDividend(_) => "Cash Dividend",
        TransactionTypeDto::AssetDividend(_) => "Asset Dividend",
        TransactionTypeDto::AssetTransferOut(_) => "Asset Transfer Out",
        TransactionTypeDto::AssetTransferIn(_) => "Asset Transfer In",
        TransactionTypeDto::AssetTrade(_) => "Asset Trade",
        TransactionTypeDto::AssetBalanceTransfer(_) => "Asset Balance Transfer",
        TransactionTypeDto::AccountFees(_) => "Account Fees",
        TransactionTypeDto::CashBalanceTransfer(_) => "Cash Balance Transfer",
    }
}

fn transaction_type_id(t: &TransactionTypeDto) -> i32 {
    match t {
        TransactionTypeDto::Regular(_) => 1,
        TransactionTypeDto::CashTransferOut(_) => 2,
        TransactionTypeDto::CashTransferIn(_) => 3,
        TransactionTypeDto::CashDividend(_) => 4,
        TransactionTypeDto::AssetTransferOut(_) => 5,
        TransactionTypeDto::AssetTransferIn(_) => 6,
        TransactionTypeDto::AssetTrade(_) => 7,
        TransactionTypeDto::AssetSale(_) => 8,
        TransactionTypeDto::AssetPurchase(_) => 9,
        TransactionTypeDto::AssetDividend(_) => 10,
        TransactionTypeDto::AssetBalanceTransfer(_) => 11,
        TransactionTypeDto::AccountFees(_) => 12,
        TransactionTypeDto::CashBalanceTransfer(_) => 13,
    }
}

fn fee_type_name(t: &FeeEntryTypesDto) -> &'static str {
    match t {
        FeeEntryTypesDto::Transaction => "Transaction",
        FeeEntryTypesDto::Exchange => "Exchange",
        FeeEntryTypesDto::WithholdingTax => "Withholding Tax",
    }
}

fn primary_leg(t: &TransactionDto) -> (Decimal, i32, Uuid, Option<String>) {
    let single = |e: &EntryDto| (e.quantity, e.asset_id, e.account_id, None::<String>);
    match &t.transaction_type {
        TransactionTypeDto::Regular(m) => (
            m.entry.quantity,
            m.entry.asset_id,
            m.entry.account_id,
            m.description.clone(),
        ),
        TransactionTypeDto::AssetPurchase(m) => single(&m.purchase),
        TransactionTypeDto::AssetSale(m) => single(&m.sale),
        TransactionTypeDto::CashTransferIn(m) => single(&m.entry),
        TransactionTypeDto::CashTransferOut(m) => single(&m.entry),
        TransactionTypeDto::CashDividend(m) => single(&m.entry),
        TransactionTypeDto::AssetDividend(m) => single(&m.entry),
        TransactionTypeDto::AssetTransferOut(m) => single(&m.entry),
        TransactionTypeDto::AssetTransferIn(m) => single(&m.entry),
        TransactionTypeDto::AssetTrade(m) => single(&m.incoming_entry),
        TransactionTypeDto::AssetBalanceTransfer(m) => single(&m.incoming_change),
        TransactionTypeDto::AccountFees(m) => single(&m.entry),
        TransactionTypeDto::CashBalanceTransfer(m) => single(&m.incoming_change),
    }
}

fn transaction_legs(t: &TransactionTypeDto) -> Vec<(EntryDto, Option<i32>)> {
    match t {
        TransactionTypeDto::Regular(m) => vec![(m.entry.clone(), Some(m.category_id))],
        TransactionTypeDto::AssetPurchase(m) => {
            vec![(m.purchase.clone(), None), (m.sale.clone(), None)]
        }
        TransactionTypeDto::AssetSale(m) => {
            vec![(m.sale.clone(), None), (m.proceeds.clone(), None)]
        }
        TransactionTypeDto::CashTransferIn(m) => vec![(m.entry.clone(), None)],
        TransactionTypeDto::CashTransferOut(m) => vec![(m.entry.clone(), None)],
        TransactionTypeDto::CashDividend(m) => vec![(m.entry.clone(), None)],
        TransactionTypeDto::AssetDividend(m) => vec![(m.entry.clone(), None)],
        TransactionTypeDto::AssetTransferOut(m) => vec![(m.entry.clone(), None)],
        TransactionTypeDto::AssetTransferIn(m) => vec![(m.entry.clone(), None)],
        TransactionTypeDto::AssetTrade(m) => {
            vec![
                (m.outgoing_entry.clone(), None),
                (m.incoming_entry.clone(), None),
            ]
        }
        TransactionTypeDto::AssetBalanceTransfer(m) => vec![
            (m.outgoing_change.clone(), None),
            (m.incoming_change.clone(), None),
        ],
        TransactionTypeDto::AccountFees(m) => vec![(m.entry.clone(), None)],
        TransactionTypeDto::CashBalanceTransfer(m) => vec![
            (m.outgoing_change.clone(), None),
            (m.incoming_change.clone(), None),
        ],
    }
}

fn downsample<T: Clone>(points: Vec<T>, max: usize) -> Vec<T> {
    let len = points.len();
    if len <= max || max < 2 {
        return points;
    }
    let last = len - 1;
    let steps = max - 1;
    (0..max)
        .map(|i| points[(i * last) / steps].clone())
        .collect()
}

fn format_rfc3339(dt: OffsetDateTime) -> String {
    dt.format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default()
}

fn parse_datetime(s: &str) -> Result<OffsetDateTime> {
    parse_datetime_at(s, time::Time::MIDNIGHT)
}

fn parse_datetime_upper(s: &str) -> Result<OffsetDateTime> {
    let end_of_day = time::Time::from_hms_nano(23, 59, 59, 999_999_999).unwrap();
    parse_datetime_at(s, end_of_day)
}

fn parse_datetime_at(s: &str, fallback: time::Time) -> Result<OffsetDateTime> {
    if let Ok(dt) = OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339) {
        return Ok(dt);
    }
    let date_format =
        time::format_description::parse_borrowed::<2>("[year]-[month]-[day]").unwrap();
    let date = time::Date::parse(s, &date_format)?;
    Ok(date.with_time(fallback).assume_utc())
}

fn to_category_result(r: AiCategoryModel) -> CategoryResult {
    CategoryResult {
        id: r.id,
        category: r.category,
        category_type: r.category_type,
        icon: r.icon,
    }
}

fn to_asset_result(r: AiAssetModel) -> AssetResult {
    AssetResult {
        id: r.id,
        asset_name: r.asset_name,
        ticker: r.ticker,
        asset_type: r.asset_type,
    }
}

fn to_search_result(m: AiTransactionSearchModel) -> TransactionSearchResult {
    TransactionSearchResult {
        transaction_id: m.transaction_id,
        description: m.description,
        date_transacted: m.date_transacted,
        quantity: m.quantity,
        asset_name: m.asset_name,
        account_name: m.account_name,
    }
}
