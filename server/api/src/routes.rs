use crate::{handlers, observability, AppState};
use axum::{
    routing::{delete, get, post},
    Router,
};

pub(crate) fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api/users", post(handlers::user_handler::post_user))
        .route(
            "/api/users/:user_id",
            get(handlers::user_handler::get_user_by_id),
        )
        .route(
            "/api/users/:user_id/transactions",
            post(handlers::transaction_handler::post_transactions),
        )
        .route(
            "/api/users/:user_id/transactions/:group_id",
            post(handlers::transaction_handler::post_transactions_by_group_id),
        )
        .route(
            "/api/users/:user_id/transactions/:group_id",
            delete(handlers::transaction_handler::delete_transactions_by_group_id),
        )
        .route(
            "/api/users/:user_id/transactions",
            get(handlers::transaction_handler::get_transactions),
        )
        .route(
            "/api/users/:user_id/portfolio",
            get(handlers::portfolio_handler::get_portfolio),
        )
        .route(
            "/api/users/:user_id/portfolio/accounts",
            post(handlers::portfolio_handler::post_portfolio_account),
        )
        .route("/api/assets", get(handlers::asset_handler::get_assets))
        .route(
            "/api/assets/:id",
            get(handlers::asset_handler::get_asset_by_id),
        )
        .route(
            "/api/constants/categories",
            get(handlers::constants_handler::get_categories),
        )
        .route(
            "/api/auth",
            post(handlers::auth_handler::post_login_details),
        )
        .layer(observability::create_tower_http_tracing_layer())
        .with_state(state)
}
