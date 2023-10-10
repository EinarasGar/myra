use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        super::handlers::portfolio_handler::get_portfolio_history,
        super::handlers::portfolio_handler::post_portfolio_account,
    ),
    components(
        schemas(super::view_models::portfolio_history_view_model::PortfolioHistoryViewModel),
        schemas(super::view_models::portfolio_account_view_model::PortfolioAccountViewModel),
        schemas(super::view_models::asset_rate_view_model::AssetRateViewModel),
    ),
    tags(
        (name = "Myra", description = "Best product!")
    )
)]
pub struct ApiDoc;
