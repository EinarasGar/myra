use axum::{extract::Path, Json};
use uuid::Uuid;

use crate::{
    app_error::AppError,
    auth::AuthenticatedUserState,
    states::PortfolioServiceState,
    view_models::portfolio_view_model::{
        PortfolioAccountViewModel, PortfolioEntryViewModel, PortfolioViewModel,
    },
};

#[tracing::instrument(skip(portfolio_service), ret, err)]
pub async fn get_portfolio(
    Path(user_id): Path<Uuid>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    AuthenticatedUserState(auth): AuthenticatedUserState,
) -> Result<Json<PortfolioViewModel>, AppError> {
    let portfolio_assets_dto = portfolio_service.get_portfolio(user_id).await?;
    let response_assets: Vec<PortfolioEntryViewModel> = portfolio_assets_dto
        .iter()
        .map(|val| val.clone().into())
        .collect();

    let response = PortfolioViewModel {
        portfolio_entries: response_assets,
    };

    Ok(response.into())
}

#[tracing::instrument(skip(portfolio_service), ret, err)]
pub async fn post_portfolio_account(
    Path(user_id): Path<Uuid>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    AuthenticatedUserState(auth): AuthenticatedUserState,
    Json(params): Json<PortfolioAccountViewModel>,
) -> Result<Json<PortfolioAccountViewModel>, AppError> {
    let new_model = portfolio_service
        .insert_or_update_portfolio_account(user_id, params.clone().into())
        .await?;

    let ret_model: PortfolioAccountViewModel = new_model.into();
    Ok(ret_model.into())
}
