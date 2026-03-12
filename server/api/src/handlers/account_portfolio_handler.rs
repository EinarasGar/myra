use std::collections::HashSet;

use axum::{extract::Path, Json};
use business::dtos::{
    assets::asset_id_dto::AssetIdDto, net_worth::range_dto::RangeDto, paging_dto::PagingDto,
    portfolio::overview::PortfolioOverviewType,
};
use itertools::Itertools;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    converters::{transaction_dtos_to_account_ids_hashset, transaction_dtos_to_asset_ids_hashset},
    errors::ApiError,
    extractors::ValidatedQuery,
    states::{
        AccountsServiceState, AssetsServiceState, PortfolioOverviewServiceState,
        PortfolioServiceState, TransactionManagementServiceState, UsersServiceState,
    },
    view_models::{
        base_models::search::{AccountTransactionsPage, PaginatedSearchQuery},
        errors::GetResponses,
        portfolio::{
            base_models::metadata_lookup::HoldingsMetadataLookupTables,
            get_networth_history::{
                GetNetWorthHistoryRequestParams, GetNetWorthHistoryResponseViewModel,
            },
            get_overview::{GetPortfolioOverviewQueryParams, GetPortfolioOverviewViewModel},
        },
        transactions::base_models::metadata_lookup::MetadataLookupTables,
    },
};

/// Get Account Net Worth History
///
/// Returns net worth history scoped to a specific account.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/accounts/{account_id}/portfolio/history",
    tag = "Account Portfolio",
    responses(
        (status = 200, description = "Account portfolio history calculated successfully", body = GetNetWorthHistoryResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id"),
        ("account_id" = Uuid, Path, description = "Account id"),
        GetNetWorthHistoryRequestParams
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_account_networth_history(
    Path((user_id, account_id)): Path<(Uuid, Uuid)>,
    ValidatedQuery(query_params): ValidatedQuery<GetNetWorthHistoryRequestParams>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    UsersServiceState(user_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetNetWorthHistoryResponseViewModel>, ApiError> {
    let range = RangeDto::StringBased(query_params.range.clone());
    let default_asset = AssetIdDto(match &query_params.default_asset_id {
        Some(id) => id.0,
        None => user_service.get_full_user(user_id).await?.default_asset_id,
    });

    let history = portfolio_service
        .get_full_portfolio_history(user_id, default_asset, range, Some(account_id))
        .await?;

    let response = GetNetWorthHistoryResponseViewModel {
        sums: history.into_iter().map_into().collect(),
        range: query_params.range.to_string(),
    };

    Ok(response.into())
}

/// Get Account Portfolio Overview
///
/// Returns portfolio overview scoped to a specific account.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/accounts/{account_id}/portfolio/overview",
    tag = "Account Portfolio",
    responses(
        (status = 200, description = "Account portfolio overview", body = GetPortfolioOverviewViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id"),
        ("account_id" = Uuid, Path, description = "Account id"),
        GetPortfolioOverviewQueryParams
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_account_portfolio_overview(
    Path((user_id, account_id)): Path<(Uuid, Uuid)>,
    ValidatedQuery(_query_params): ValidatedQuery<GetPortfolioOverviewQueryParams>,
    PortfolioOverviewServiceState(portfolio_service): PortfolioOverviewServiceState,
    UsersServiceState(_user_service): UsersServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetPortfolioOverviewViewModel>, ApiError> {
    let default_asset = match _query_params.default_asset_id.0 {
        Some(id) => AssetIdDto(id),
        None => AssetIdDto(0),
    };

    let overview = portfolio_service
        .get_portfolio_overview(default_asset, user_id, Some(account_id))
        .await?;

    let account_ids = overview
        .portfolios
        .iter()
        .map(|x| match x {
            PortfolioOverviewType::Asset(a) => a.account_id,
            PortfolioOverviewType::Cash(c) => c.account_id,
        })
        .collect::<HashSet<Uuid>>();

    let asset_ids = overview
        .portfolios
        .iter()
        .map(|x| match x {
            PortfolioOverviewType::Asset(a) => a.asset_id,
            PortfolioOverviewType::Cash(c) => c.asset_id,
        })
        .collect::<HashSet<i32>>();

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let response = GetPortfolioOverviewViewModel {
        portfolios: overview.into(),
        lookup_tables: HoldingsMetadataLookupTables {
            accounts: accounts.into_iter().map_into().collect(),
            assets: assets.into_iter().map_into().collect(),
        },
    };

    Ok(response.into())
}

/// Get Account Transactions
///
/// Returns paginated transactions scoped to a specific account.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/accounts/{account_id}/transactions",
    tag = "Account Portfolio",
    responses(
        (status = 200, description = "Account transactions retrieved successfully.", body = AccountTransactionsPage),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id"),
        ("account_id" = Uuid, Path, description = "Account id"),
        PaginatedSearchQuery
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_account_transactions(
    Path((user_id, account_id)): Path<(Uuid, Uuid)>,
    ValidatedQuery(query_params): ValidatedQuery<PaginatedSearchQuery>,
    AssetsServiceState(asset_service): AssetsServiceState,
    TransactionManagementServiceState(transaction_service): TransactionManagementServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<AccountTransactionsPage>, ApiError> {
    let paging_dto = PagingDto {
        start: query_params.start,
        count: query_params.count,
    };

    let dtos = transaction_service
        .search_transactions(user_id, paging_dto, Some(account_id))
        .await?;

    let asset_ids = transaction_dtos_to_asset_ids_hashset(&dtos.results.iter().collect::<Vec<_>>());
    let account_ids =
        transaction_dtos_to_account_ids_hashset(&dtos.results.iter().collect::<Vec<_>>());

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let ret = AccountTransactionsPage {
        results: dtos.results.into_iter().map(Into::into).collect(),
        total_results: dtos.total_results,
        lookup_tables: MetadataLookupTables {
            assets: assets.into_iter().map_into().collect(),
            accounts: accounts.into_iter().map_into().collect(),
            ..Default::default()
        },
    };

    Ok(ret.into())
}
