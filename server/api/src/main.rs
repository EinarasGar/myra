use tracing::info;

use crate::states::AppState;

pub mod auth;
pub mod converters;
pub mod errors;
mod fallback;
pub(crate) mod handlers;
mod observability;
pub mod openapi;
pub mod parsers;
pub(crate) mod routes;
pub(crate) mod states;
pub(crate) mod view_models;

#[tokio::main]
async fn main() {
    //Initialize logging and OpenTelemetry
    observability::initialize_tracing_subscriber();

    //Create shared services instance, which contains a connection to a database
    let shared_state = AppState {
        services_collection: business::service_collection::Services::new().await.unwrap(),
    };

    //Initialize a router for the API
    let app = routes::create_router(shared_state).fallback(fallback::handler_404);

    // Run the WebServer
    let listener = tokio::net::TcpListener::bind("0.0.0.0:5000").await.unwrap();
    info!("Starting web server on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
