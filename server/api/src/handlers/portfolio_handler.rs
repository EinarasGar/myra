use axum::{extract::Path, Json};
use log::trace;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    states::PortfolioServiceState,
    view_models::portfolio_view_model::{AllPortfolioRespdata, PortfolioRespData},
};

pub async fn get_portfolio(
    Path(id): Path<Uuid>,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
) -> Result<Json<AllPortfolioRespdata>, AppError> {
    trace!("GET /users/{}/portfolio was called", id);

    let portfolio_assets_dto = portfolio_service.get_portfolio(id).await?;
    let mut response_assets: Vec<PortfolioRespData> = Vec::new();
    for dto in portfolio_assets_dto {
        response_assets.push(dto.into())
    }
    let response = AllPortfolioRespdata {
        assets: response_assets,
    };

    Ok(response.into())
}
