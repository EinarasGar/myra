use utoipa::OpenApi;

use crate::view_models::{
    asset_rate_view_model::AssetRateViewModel, asset_view_model::AssetViewModel,
    portfolio_account_view_model::PortfolioAccountViewModel,
    portfolio_entry_view_model::PortfolioEntryViewModel,
    portfolio_history_view_model::PortfolioHistoryViewModel,
    portfolio_view_model::PortfolioViewModel,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        super::handlers::portfolio_handler::get_portfolio_history,
        super::handlers::portfolio_handler::post_portfolio_account,
        super::handlers::portfolio_handler::get_portfolio,
    ),
    components(
        schemas(PortfolioHistoryViewModel),
        schemas(PortfolioAccountViewModel),
        schemas(AssetRateViewModel),
        schemas(PortfolioViewModel),
        schemas(PortfolioEntryViewModel),
        schemas(AssetViewModel),
    ),
    tags(
        (name = "Myra", description = "Best product!")
    )
)]
pub struct ApiDoc;
