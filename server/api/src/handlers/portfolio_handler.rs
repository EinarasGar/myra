use axum::{
    extract::{Path, Query},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::{AssetsServiceState, PortfolioServiceState, UsersServiceState},
    view_models::portfolio::get_networth_history::{
        GetNetWorthHistoryRequestParams, GetNetWorthHistoryResponseViewModel,
    },
};

#[derive(Deserialize, Debug)]
pub struct GetPortfolioQueryParams {
    _default_asset_id: Option<i32>,
}

// /// Get portfolio
// ///
// /// Gets portfolio state at current this time.
// #[utoipa::path(
//     get,
//     path = "/api/users/:user_id/portfolio",
//     tag = "Portfolio",
//     responses(
//         (status = 200, description = "Portoflio retrieved successfully", body = PortfolioViewModel),
//         (status = NOT_FOUND, description = "History was not found")
//     ),
//     params(
//         ("user_id" = Uuid, Path, description = "User id for who to get portfolio for"),
//         ("default_asset_id" = Option<i32>, Query, description = "Default asset id to use for getting porftolio reference.
//          If not provided, the default asset id from the user will be used")
//     )
// )]
// #[tracing::instrument(skip_all, err)]
// pub async fn get_portfolio(
//     Path(_user_id): Path<Uuid>,
//     _query_params: Query<GetPortfolioQueryParams>,
//     PortfolioServiceState(_portfolio_service): PortfolioServiceState,
//     UsersServiceState(_user_service): UsersServiceState,
//     AuthenticatedUserState(_auth): AuthenticatedUserState,
// ) -> Result<Json<PortfolioViewModel>, ApiError> {
//     unimplemented!()
//     // let default_asset = match query_params.default_asset_id {
//     //     Some(i) => i,
//     //     None => user_service.get_full_user(user_id).await?.default_asset_id,
//     // };

//     // let portfolio_assets_dto = portfolio_service
//     //     .get_portfolio(user_id, default_asset)
//     //     .await?;
//     // let response: PortfolioViewModel = portfolio_assets_dto.into();

//     // Ok(response.into())
// }

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
        ("default_asset_id" = Option<i32>, Query, description = "Default asset id to use for retrieving net worth history. If not provided, the default asset id from the user will be used"),
        GetNetWorthHistoryRequestParams
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_networth_history(
    Path(_user_id): Path<Uuid>,
    _query_params: Query<GetNetWorthHistoryRequestParams>,
    PortfolioServiceState(_portfolio_service): PortfolioServiceState,
    AssetsServiceState(_asset_service): AssetsServiceState,
    UsersServiceState(_user_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetNetWorthHistoryResponseViewModel>, ApiError> {
    unimplemented!()
    // let default_asset: i32 = if query_params.default_asset_id.is_some() {
    //     query_params.default_asset_id.unwrap()
    // } else {
    //     user_service.get_full_user(user_id).await?.default_asset_id
    // };

    // let hisotry = portfolio_service
    //     .get_full_portfolio_history(user_id, default_asset, Duration::hours(12))
    //     .await?;

    // let response = PortfolioHistoryViewModel {
    //     sums: hisotry.into_iter().map(|x| x.into()).collect(),
    // };

    // Ok(response.into())
}
