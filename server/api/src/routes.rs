use crate::{handlers, observability, AppState};
use axum::{
    routing::{get, post},
    Router,
};

pub(crate) fn create_router(state: AppState) -> Router {
    let app = Router::new()
        .route("/users", post(handlers::user_handler::post_user))
        .route(
            "/users/:id/transactions",
            post(handlers::transaction_handler::post_transactions),
        )
        .route(
            "/users/:id/transactions",
            get(handlers::transaction_handler::get_transactions),
        )
        .route(
            "/users/:id/portfolio",
            get(handlers::portfolio_handler::get_portfolio),
        )
        .route(
            "/users/:id/portfolio/accounts",
            post(handlers::portfolio_handler::post_portfolio_account),
        )
        .route("/assets", get(handlers::asset_handler::get_assets))
        .route("/assets/:id", get(handlers::asset_handler::get_asset_by_id))
        .route("/constants/categories", get(handlers::constants_handler::get_categories))
        .layer(observability::create_tower_http_tracing_layer())
        .with_state(state);
    app
}
