use crate::{handlers, observability, openapi::ApiDoc, AppState};
use axum::{
    routing::{delete, get, post, put},
    Router,
};
use utoipa::OpenApi;
use utoipa_rapidoc::RapiDoc;
use utoipa_redoc::{Redoc, Servable};

#[rustfmt::skip]
pub(crate) fn create_router(state: AppState) -> Router {
    Router::new()
        .merge(Redoc::with_url("/redoc", ApiDoc::openapi()))
        .merge(RapiDoc::with_openapi("/api-docs/openapi.json", ApiDoc::openapi()).path("/rapidoc"))
        .route("/api/users",                                                        post(  handlers::user_handler::post_user))
        .route("/api/users/:user_id",                                               get(   handlers::user_handler::get_user_by_id))
        .route("/api/users/:user_id/transactions/groups",                           post(  handlers::transaction_groups::add))
        .route("/api/users/:user_id/transactions/groups/:group_id",                 put(   handlers::transaction_groups::update))
        .route("/api/users/:user_id/transactions/groups/:group_id",                 delete(handlers::transaction_groups::delete))
        .route("/api/users/:user_id/transactions/groups",                           get(   handlers::transaction_groups::get))
        .route("/api/users/:user_id/transactions/:transaction_id",                  put(   handlers::transactions::update))
        .route("/api/users/:user_id/transactions/:transaction_id",                  delete(handlers::transactions::delete))
        .route("/api/users/:user_id/transactions",                                  get(   handlers::transactions::get))
        .route("/api/users/:user_id/transactions/individual",                       post(  handlers::individual_transactions::add))
        .route("/api/users/:user_id/transactions/individual/:transaction_id",       put(   handlers::individual_transactions::update))
        .route("/api/users/:user_id/transactions/individual",                       get(   handlers::individual_transactions::get))
        .route("/api/users/:user_id/transactions/individual/:transaction_id",       get(   handlers::individual_transactions::get_single))
        .route("/api/users/:user_id/assets/:asset_id",                              delete(handlers::user_asset_handler::delete_asset))
        .route("/api/users/:user_id/assets/:asset_id/:reference_id/rates",          delete(handlers::user_asset_handler::delete_asset_pair_rates))
        .route("/api/users/:user_id/assets/:asset_id/:reference_id",                delete(handlers::user_asset_handler::delete_asset_pair))
        .route("/api/users/:user_id/assets/:asset_id/:reference_id/rates",          post(  handlers::user_asset_handler::post_custom_asset_rates))
        .route("/api/users/:user_id/assets",                                        post(  handlers::user_asset_handler::post_custom_asset))
        .route("/api/users/:user_id/assets/:asset_id",                              put(   handlers::user_asset_handler::put_custom_asset))
        .route("/api/users/:user_id/assets/:asset_id",                              get(   handlers::user_asset_handler::get_user_asset))
        .route("/api/users/:user_id/assets/:asset_id/:reference_id",                get(   handlers::user_asset_handler::get_user_asset_pair))
        .route("/api/users/:user_id/assets/:asset_id/:reference_id/rates",          get(   handlers::user_asset_handler::get_user_asset_pair_rates))
        .route("/api/users/:user_id/assets/:asset_id/:reference_id/usermetadata",   put(   handlers::user_asset_handler::put_custom_asset_pair))
        .route("/api/users/:user_id/accounts/:account_id",                          get(   handlers::accounts_handler::get_account))
        .route("/api/users/:user_id/accounts/:account_id",                          put(   handlers::accounts_handler::update_account))
        .route("/api/users/:user_id/accounts/:account_id",                          delete(handlers::accounts_handler::delete_account))
        .route("/api/users/:user_id/accounts",                                      get(   handlers::accounts_handler::get_accounts))
        .route("/api/users/:user_id/accounts",                                      post(  handlers::accounts_handler::add_account))
        .route("/api/users/:user_id/portfolio/history",                             get(   handlers::portfolio_handler::get_networth_history))
        .route("/api/users/:user_id/portfolio/holdings",                            get(   handlers::portfolio_handler::get_holdings))
        .route("/api/accounts/types",                                               get(   handlers::accounts_handler::get_account_types))
        .route("/api/accounts/liquiditytypes",                                      get(   handlers::accounts_handler::get_account_liquidity_types))
        .route("/api/assets/:asset_id",                                             get(   handlers::asset_handler::get_asset))
        .route("/api/assets/:asset_id/:reference_id",                               get(   handlers::asset_handler::get_asset_pair))
        .route("/api/assets/:asset_id/:reference_id/rates",                         get(   handlers::asset_handler::get_asset_pair_rates))
        .route("/api/assets",                                                       get(   handlers::asset_handler::search_assets))
        .route("/api/auth",                                                         post(  handlers::auth_handler::post_login_details))
        .layer(observability::create_tower_http_tracing_layer())
        .with_state(state)
}
