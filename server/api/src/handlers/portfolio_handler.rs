use axum::{extract::Path, Json};
use uuid::Uuid;

use crate::{
    app_error::AppError,
    states::PortfolioServiceState,
    view_models::portfolio_view_model::{
        PortfolioAccountViewModel, PortfolioEntryViewModel, PortfolioViewModel,
    },
};

#[tracing::instrument(skip(portfolio_service), ret, err)]
pub async fn get_portfolio(
    Path(id): Path<Uuid>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
) -> Result<Json<PortfolioViewModel>, AppError> {
    let portfolio_assets_dto = portfolio_service.get_portfolio(id).await?;
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
    Path(id): Path<Uuid>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    Json(params): Json<PortfolioAccountViewModel>,
) -> Result<Json<PortfolioAccountViewModel>, AppError> {
    portfolio_service
        .insert_or_update_portfolio_account(id, params.clone().into())
        .await?;

    Ok(params.into())
}
