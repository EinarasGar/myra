use axum::{
    extract::{Path, Query},
    Json,
};
use serde::Deserialize;
use time::Duration;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::{AssetsServiceState, PortfolioServiceState, UsersServiceState},
    view_models::{
        portfolio_account_view_model::PortfolioAccountViewModel,
        portfolio_history_view_model::PortfolioHistoryViewModel,
        portfolio_view_model::PortfolioViewModel,
    },
};

#[derive(Deserialize, Debug)]
pub struct GetPortfolioQueryParams {
    default_asset_id: Option<i32>,
}

/// Get portfolio
///
/// Gets portfolio state at current this time.
#[utoipa::path(
    get,
    path = "/api/users/:user_id/portfolio",
    tag = "Portfolio",
    responses(
        (status = 200, description = "Portoflio retrieved successfully", body = PortfolioViewModel),
        (status = NOT_FOUND, description = "History was not found")
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for who to get portfolio for"),
        ("default_asset_id" = Option<i32>, Query, description = "Default asset id to use for getting porftolio reference.
         If not provided, the default asset id from the user will be used")
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_portfolio(
    Path(user_id): Path<Uuid>,
    query_params: Query<GetPortfolioQueryParams>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    UsersServiceState(user_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PortfolioViewModel>, ApiError> {
    let default_asset = match query_params.default_asset_id {
        Some(i) => i,
        None => user_service.get_full_user(user_id).await?.default_asset_id,
    };

    let portfolio_assets_dto = portfolio_service
        .get_portfolio(user_id, default_asset)
        .await?;
    let response: PortfolioViewModel = portfolio_assets_dto.into();

    Ok(response.into())
}

/// Get portfolio history
///
/// Get full portfolio history for a user. The returned
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/portfolio/history",
    tag = "Portfolio",
    responses(
        (status = 200, description = "Portoflio hisotry calculated successfully", body = PortfolioHistoryViewModel),
        (status = NOT_FOUND, description = "History was not found")
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for who to calculate history"),
        ("default_asset_id" = Option<i32>, Query, description = "Default asset id to use for calculating history.
         If not provided, the default asset id from the user will be used")
    )
)]
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

/// Post Portfolio Account
///
/// The portfolio account is used to store same assets in different baskets
#[utoipa::path(
    post,
    path = "/api/users/:user_id/portfolio/accounts",
    tag = "Portfolio",
    responses(
        (status = 200, description = "Portoflio account created successfully", body = PortfolioAccountViewModel),
    ),
    request_body (
      content = PortfolioAccountViewModel,
      examples(
        ("Add" = (summary = "Adding a new account", value = json!({"name": "Vanguard"}))),
        ("Update" = (summary = "Updating existing account", value = json!({"id": "2396480f-0052-4cf0-81dc-8cedbde5ce13", "name": "Vanguard ISA"})))
    )
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for who to post account for"),
    )

)]
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
