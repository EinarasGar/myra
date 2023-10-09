use std::collections::{HashMap, HashSet};

use axum::{
    extract::{Path, Query},
    Json,
};
use business::dtos::asset_pair_rate_dto::AssetPairRateDto;
use serde::Deserialize;
use time::Duration;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::{AssetsServiceState, PortfolioServiceState, UsersServiceState},
    view_models::{
        asset_rate_view_model::AssetRateViewModel,
        portfolio_account_view_model::PortfolioAccountViewModel,
        portfolio_entry_view_model::PortfolioEntryViewModel,
        portfolio_history_view_model::PortfolioHistoryViewModel,
        portfolio_view_model::PortfolioViewModel,
    },
};

#[derive(Deserialize, Debug)]
pub struct GetPortfolioQueryParams {
    default_asset_id: Option<i32>,
}

#[tracing::instrument(skip_all, err)]
pub async fn get_portfolio(
    Path(user_id): Path<Uuid>,
    query_params: Query<GetPortfolioQueryParams>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    UsersServiceState(user_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PortfolioViewModel>, ApiError> {
    let portfolio_assets_dto = portfolio_service.get_portfolio(user_id).await?;

    let mut unique_asset_ids: HashSet<i32> = HashSet::new();
    portfolio_assets_dto.iter().for_each(|val| {
        unique_asset_ids.insert(val.asset.asset_id);
    });

    //if default asset is not provided, use the one stored in the database
    let default_asset = match query_params.default_asset_id {
        Some(i) => i,
        None => user_service.get_full_user(user_id).await?.default_asset_id,
    };

    let asset_rates: HashMap<i32, AssetPairRateDto> = asset_service
        .get_assets_rates_default_latest(default_asset, unique_asset_ids)
        .await?;

    let response_assets: Vec<PortfolioEntryViewModel> = portfolio_assets_dto
        .iter()
        .map(|val| PortfolioEntryViewModel {
            asset: val.asset.clone().into(),
            account: val.account.clone().into(),
            sum: val.sum,
            last_rate: asset_rates
                .get(&val.asset.asset_id)
                .map(|rate| AssetRateViewModel::from(rate.clone())),
        })
        .collect();

    let response = PortfolioViewModel {
        portfolio_entries: response_assets,
    };

    Ok(response.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn get_portfolio_history(
    Path(user_id): Path<Uuid>,
    query_params: Query<GetPortfolioQueryParams>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    AssetsServiceState(_asset_service): AssetsServiceState,
    UsersServiceState(user_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PortfolioHistoryViewModel>, ApiError> {
    let default_asset: i32 = if query_params.default_asset_id.is_some() {
        query_params.default_asset_id.unwrap()
    } else {
        user_service.get_full_user(user_id).await?.default_asset_id
    };

    let hisotry = portfolio_service
        .get_full_portfolio_history(user_id, default_asset, Duration::hours(12))
        .await?;

    let response = PortfolioHistoryViewModel {
        sums: hisotry.into_iter().map(|x| x.into()).collect(),
    };

    Ok(response.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn post_portfolio_account(
    Path(user_id): Path<Uuid>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(params): Json<PortfolioAccountViewModel>,
) -> Result<Json<PortfolioAccountViewModel>, ApiError> {
    let new_model = portfolio_service
        .insert_or_update_portfolio_account(user_id, params.clone().into())
        .await?;

    let ret_model: PortfolioAccountViewModel = new_model.into();
    Ok(ret_model.into())
}
