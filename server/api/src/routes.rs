use crate::{handlers, observability, openapi::build_openapi_json, AppState};
use axum::{
    http::{header, HeaderValue, Method},
    response::{Html, IntoResponse},
    routing::{delete, get, post, put},
    Router,
};
use tower_http::cors::CorsLayer;
use utoipa_rapidoc::RapiDoc;
use utoipa_redoc::Redoc;

#[rustfmt::skip]
pub(crate) fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api-docs/openapi.json",                                            get(serve_openapi_json))
        .route("/redoc",                                                            get(serve_redoc))
        .route("/rapidoc",                                                          get(serve_rapidoc))
        .route("/api/users/{user_id}/transactions/groups",                              post(handlers::transaction_groups::add_transaction_group).put(handlers::transaction_groups::group_individual_transactions).get(handlers::transaction_groups::get_transaction_groups))
        .route("/api/users/{user_id}/transactions/groups/{group_id}",                   put(   handlers::transaction_groups::update_transaction_group))
        .route("/api/users/{user_id}/transactions/groups/{group_id}",                   delete(handlers::transaction_groups::delete_transaction_group))
        .route("/api/users/{user_id}/transactions/{transaction_id}",                    put(   handlers::transactions::update_transaction))
        .route("/api/users/{user_id}/transactions/{transaction_id}",                    delete(handlers::transactions::delete_transaction))
        .route("/api/users/{user_id}/transactions",                                     get(   handlers::transactions::get_transactions))
        .route("/api/users/{user_id}/transactions/individual",                          post(  handlers::individual_transactions::add_individual_transaction))
        .route("/api/users/{user_id}/transactions/individual/{transaction_id}",         put(   handlers::individual_transactions::update_individual_transaction))
        .route("/api/users/{user_id}/transactions/individual",                          get(   handlers::individual_transactions::get_individual_transactions))
        .route("/api/users/{user_id}/transactions/individual/{transaction_id}",         get(   handlers::individual_transactions::get_single))
        .route("/api/categories",                                                       get(   handlers::category_handler::search_categories))
        .route("/api/categories/types",                                                 get(   handlers::category_handler::get_category_types))
        .route("/api/users/{user_id}/categories",                                       get(   handlers::user_category_handler::get_categories))
        .route("/api/users/{user_id}/categories",                                       post(  handlers::user_category_handler::post_user_category))
        .route("/api/users/{user_id}/categories/{category_id}",                         get(   handlers::user_category_handler::get_user_category))
        .route("/api/users/{user_id}/categories/{category_id}",                         put(   handlers::user_category_handler::put_user_category))
        .route("/api/users/{user_id}/categories/{category_id}",                         delete(handlers::user_category_handler::delete_user_category))
        .route("/api/users/{user_id}/categories/types",                                 get(   handlers::user_category_handler::get_user_category_types))
        .route("/api/users/{user_id}/categories/types",                                 post(  handlers::user_category_handler::post_user_category_type))
        .route("/api/users/{user_id}/categories/types/{type_id}",                       put(   handlers::user_category_handler::put_user_category_type))
        .route("/api/users/{user_id}/categories/types/{type_id}",                       delete(handlers::user_category_handler::delete_user_category_type))
        .route("/api/users/{user_id}/assets/{asset_id}",                                delete(handlers::user_asset_handler::delete_asset))
        .route("/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates",           delete(handlers::user_asset_handler::delete_asset_pair_rates))
        .route("/api/users/{user_id}/assets/{asset_id}/{reference_id}",                 delete(handlers::user_asset_handler::delete_asset_pair))
        .route("/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates",           post(  handlers::user_asset_handler::post_custom_asset_rates))
        .route("/api/users/{user_id}/assets",                                           get(handlers::user_asset_handler::get_user_assets).post(handlers::user_asset_handler::post_custom_asset))
        .route("/api/users/{user_id}/assets/{asset_id}/pairs",                            post(  handlers::user_asset_handler::post_asset_pair))
        .route("/api/users/{user_id}/assets/{asset_id}",                                put(   handlers::user_asset_handler::put_custom_asset))
        .route("/api/users/{user_id}/assets/{asset_id}",                                get(   handlers::user_asset_handler::get_user_asset))
        .route("/api/users/{user_id}/assets/{asset_id}/{reference_id}",                 get(   handlers::user_asset_handler::get_user_asset_pair))
        .route("/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates",           get(   handlers::user_asset_handler::get_user_asset_pair_rates))
        .route("/api/users/{user_id}/assets/{asset_id}/{reference_id}/usermetadata",    put(   handlers::user_asset_handler::put_custom_asset_pair))
        .route("/api/users/{user_id}/accounts/{account_id}/portfolio/history",         get(   handlers::account_portfolio_handler::get_account_networth_history))
        .route("/api/users/{user_id}/accounts/{account_id}/portfolio/overview",        get(   handlers::account_portfolio_handler::get_account_portfolio_overview))
        .route("/api/users/{user_id}/accounts/{account_id}/transactions",              get(   handlers::account_portfolio_handler::get_account_transactions))
        .route("/api/users/{user_id}/accounts/{account_id}",                            get(   handlers::accounts_handler::get_account))
        .route("/api/users/{user_id}/accounts/{account_id}",                            put(   handlers::accounts_handler::update_account))
        .route("/api/users/{user_id}/accounts/{account_id}",                            delete(handlers::accounts_handler::delete_account))
        .route("/api/users/{user_id}/accounts",                                         get(   handlers::accounts_handler::get_accounts))
        .route("/api/users/{user_id}/accounts",                                         post(  handlers::accounts_handler::add_account))
        .route("/api/users/{user_id}/portfolio/overview",                               get(   handlers::portfolio_handler::get_portfolio_overview))
        .route("/api/users/{user_id}/portfolio/history",                                get(   handlers::portfolio_handler::get_networth_history))
        .route("/api/users/{user_id}/portfolio/holdings",                               get(   handlers::portfolio_handler::get_holdings))
        .route("/api/accounts/types",                                                   get(   handlers::accounts_handler::get_account_types))
        .route("/api/accounts/liquidity-types",                                         get(   handlers::accounts_handler::get_account_liquidity_types))
        .route("/api/assets/types",                                                     get(   handlers::asset_handler::get_asset_types))
        .route("/api/assets/{asset_id}",                                                get(   handlers::asset_handler::get_asset))
        .route("/api/assets/{asset_id}/{reference_id}",                                 get(   handlers::asset_handler::get_asset_pair))
        .route("/api/assets/{asset_id}/{reference_id}/rates",                           get(   handlers::asset_handler::get_asset_pair_rates))
        .route("/api/assets",                                                           get(   handlers::asset_handler::search_assets))
        .route("/api/auth",                                                             post(  handlers::auth_handler::post_login_details))
        .route("/api/auth/refresh",                                                     post(  handlers::auth_handler::post_refresh_token))
        .route("/api/auth/logout",                                                      post(  handlers::auth_handler::post_logout))
        .route("/api/auth/me",                                                          get(   handlers::auth_handler::get_me))
        .route("/api/users/{user_id}/ai/chat",                                            post(  handlers::ai_handler::chat))
        .route("/api/users",                                                            post(  handlers::user_handler::post_user))
        .route("/api/users/{user_id}/files",                                          post(  handlers::file_handler::create_file))
        .route("/api/users/{user_id}/files/{file_id}",                                get(   handlers::file_handler::get_file).delete(handlers::file_handler::delete_file))
        .route("/api/users/{user_id}/files/{file_id}/confirm",                        post(  handlers::file_handler::confirm_file))
        .route("/api/users/{user_id}/files/{file_id}/url",                            get(   handlers::file_handler::get_file_url))
        .route("/api/users/{user_id}/files/{file_id}/thumbnail",                      get(   handlers::file_handler::get_file_thumbnail))
        .layer(build_cors_layer())
        .layer(observability::create_tower_http_tracing_layer())
        .with_state(state)
}

fn build_cors_layer() -> CorsLayer {
    let allowed_origin = std::env::var("CORS_ORIGIN").ok();

    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::COOKIE])
        .allow_credentials(true);

    match allowed_origin {
        Some(origin) => cors.allow_origin(
            origin
                .parse::<HeaderValue>()
                .expect("Invalid CORS_ORIGIN value"),
        ),
        None => cors.allow_origin(tower_http::cors::Any),
    }
}

async fn serve_openapi_json() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
        build_openapi_json(),
    )
}

async fn serve_redoc() -> Html<String> {
    Html(Redoc::new("/api-docs/openapi.json").to_html())
}

async fn serve_rapidoc() -> Html<String> {
    Html(RapiDoc::new("/api-docs/openapi.json").to_html())
}
