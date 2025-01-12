use std::collections::HashSet;

use axum::{
    extract::{Path, Query},
    Json,
};
use business::dtos::{
    assets::{asset_id_dto::AssetIdDto, asset_pair_ids_dto::AssetPairIdsDto},
    net_worth::range_dto::RangeDto,
};
use itertools::Itertools;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::{
        AccountsServiceState, AssetRatesServiceState, AssetsServiceState,
        PortfolioOverviewServiceState, PortfolioServiceState, UsersServiceState,
    },
    view_models::portfolio::{
        base_models::metadata_lookup::HoldingsMetadataLookupTables,
        get_holdings::{GetHoldingsResponseViewModel, GetHoldingsResponseViewModelRow},
        get_networth_history::{
            GetNetWorthHistoryRequestParams, GetNetWorthHistoryResponseViewModel,
        },
    },
};

#[derive(Deserialize, Debug)]
pub struct GetPortfolioQueryParams {
    default_asset_id: Option<i32>,
}

/// Get Holdings
///
/// Returns a list of assets that user holds and their current value.
#[utoipa::path(
    get,
    path = "/api/users/:user_id/portfolio/holdings",
    tag = "Portfolio",
    responses(
        (status = 200, description = "Portoflio holdings returned", body = GetHoldingsResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for who to retrieve holdings"),
        ("default_asset_id" = Option<i32>, Query, description = "Default asset id to use for retrieving current value of units. If not provided, the default asset id from the user will be used"),
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_holdings(
    Path(user_id): Path<Uuid>,
    query_params: Query<GetPortfolioQueryParams>,
    PortfolioOverviewServiceState(portfolio_service): PortfolioOverviewServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    UsersServiceState(user_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetHoldingsResponseViewModel>, ApiError> {
    let default_asset = match query_params.default_asset_id {
        Some(id) => id,
        None => user_service.get_full_user(user_id).await?.default_asset_id,
    };

    let holdings = portfolio_service.get_holdings(user_id).await?;

    let account_ids: HashSet<Uuid> = holdings.iter().map(|x| x.account_id).collect();
    let asset_ids: HashSet<i32> = holdings.iter().map(|x| x.asset_id).collect();
    let asset_ids2: HashSet<AssetIdDto> = holdings.iter().map(|x| AssetIdDto(x.asset_id)).collect();

    let (assets, accounts, rates) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
        asset_rates_service.get_pairs_latest_converted(asset_ids2, AssetIdDto(default_asset)),
    )?;

    tracing::info!("rates: {:?}", rates);

    let response = GetHoldingsResponseViewModel {
        holdings: holdings
            .into_iter()
            .map(|x| {
                let rate = rates.get(&AssetPairIdsDto::new(
                    AssetIdDto(x.asset_id),
                    AssetIdDto(default_asset),
                ));
                tracing::info!(
                    "assets: {:?}",
                    AssetPairIdsDto::new(AssetIdDto(x.asset_id), AssetIdDto(default_asset),)
                );
                GetHoldingsResponseViewModelRow {
                    account_id: x.account_id,
                    asset_id: x.asset_id,
                    units: x.units,
                    value: rate.map(|rate| x.units * rate.rate),
                }
            })
            .collect(),
        lookup_tables: HoldingsMetadataLookupTables {
            accounts: accounts.into_iter().map_into().collect(),
            assets: assets.into_iter().map_into().collect(),
        },
    };

    Ok(response.into())
}

/// Get Net Worth History
///
/// Returns a list of net worth of an user at specific points in time, depending on the range provided.
#[utoipa::path(
    get,
    path = "/api/users/:user_id/portfolio/history",
    tag = "Portfolio",
    responses(
        (status = 200, description = "Portoflio hisotry calculated successfully", body = GetNetWorthHistoryResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for who to retrieve net worth history"),
        GetNetWorthHistoryRequestParams
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_networth_history(
    Path(user_id): Path<Uuid>,
    query_params: Query<GetNetWorthHistoryRequestParams>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    UsersServiceState(user_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetNetWorthHistoryResponseViewModel>, ApiError> {
    let range = RangeDto::StringBased(query_params.range.clone());
    let default_asset = AssetIdDto(match query_params.default_asset_id {
        Some(id) => id,
        None => user_service.get_full_user(user_id).await?.default_asset_id,
    });

    let hisotry = portfolio_service
        .get_full_portfolio_history(user_id, default_asset, range)
        .await?;

    let response = GetNetWorthHistoryResponseViewModel {
        sums: hisotry.into_iter().map_into().collect(),
        range: query_params.range.to_string(),
    };

    Ok(response.into())
}
