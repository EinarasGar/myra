use std::net::SocketAddr;

use tracing::info;

use crate::states::AppState;

pub(crate) mod auth;
pub(crate) mod errors;
mod fallback;
pub(crate) mod handlers;
mod observability;
pub mod openapi;
pub(crate) mod routes;
pub(crate) mod states;
pub(crate) mod view_models;

pub async fn start() {
    //Initialize logging and opentelemetry
    observability::initialize_tracing_subscriber();

    //Create shared services instance, which contaisn a connectiopn to a database
    let shared_state = AppState {
        serivces_collection: business::service_collection::Services::new().await.unwrap(),
    };

    //Initize a router for the API
    let app = routes::create_router(shared_state).fallback(fallback::handler_404);

    // Run the webserver
    let addr = SocketAddr::from(([0, 0, 0, 0], 5000));
    info!("Starting web server on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
