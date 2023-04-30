use std::net::SocketAddr;

use tokio;
use tracing::info;

use crate::states::AppState;

pub(crate) mod app_error;
mod fallback;
pub(crate) mod handlers;
mod observability;
pub(crate) mod routes;
pub(crate) mod states;
pub(crate) mod view_models;

#[tokio::main]
async fn main() {
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
