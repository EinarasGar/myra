use crate::{handlers, observability, openapi::ApiDoc, AppState};
use axum::{
    routing::{get, post},
    Router,
};
use utoipa::OpenApi;
use utoipa_rapidoc::RapiDoc;
use utoipa_redoc::{Redoc, Servable};

pub(crate) fn create_router(state: AppState) -> Router {
    Router::new()
        .merge(Redoc::with_url("/redoc", ApiDoc::openapi()))
        .merge(RapiDoc::with_openapi("/api-docs/openapi.json", ApiDoc::openapi()).path("/rapidoc"))
        .route("/api/users", post(handlers::user_handler::post_user))
        .route(
            "/api/users/:user_id",
            get(handlers::user_handler::get_user_by_id),
        )
        // .route(
        //     "/api/users/:user_id/transactions",
        //     post(handlers::transaction_handler::post),
        // )
        // .route(
        //     "/api/users/:user_id/transactions/:group_id",
        //     post(handlers::transactions::post_transactions_by_group_id),
        // )
        // .route(
        //     "/api/users/:user_id/transactions/:group_id",
        //     delete(handlers::transactions::delete_transactions_by_group_id),
        // )
        // .route(
        //     "/api/users/:user_id/transactions",
        //     get(handlers::transactions::get_transactions),
        // )
        .route(
            "/api/users/:user_id/portfolio",
            get(handlers::portfolio_handler::get_portfolio),
        )
        .route(
            "/api/users/:user_id/portfolio/asset/:asset_id",
            get(handlers::portfolio_handler::get_portfolio_asset),
        )
        .route(
            "/api/users/:user_id/portfolio/history",
            get(handlers::portfolio_handler::get_portfolio_history),
        )
        .route(
            "/api/users/:user_id/portfolio/accounts",
            post(handlers::portfolio_handler::post_portfolio_account),
        )
        .route(
            "/api/users/:user_id/assets",
            post(handlers::asset_handler::post_custom_asset),
        )
        .route(
            "/api/users/:user_id/assets/:id/:pair2",
            post(handlers::asset_handler::post_custom_asset_rates),
        )
        .route(
            "/api/users/:user_id/assets/:id/:pair2",
            get(handlers::asset_handler::get_custom_asset_pair),
        )
        .route("/api/assets", get(handlers::asset_handler::get_assets))
        .route(
            "/api/assets/:id",
            get(handlers::asset_handler::get_asset_by_id),
        )
        .route(
            "/api/assets/:id/:pair2",
            get(handlers::asset_handler::get_asset_pair),
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
