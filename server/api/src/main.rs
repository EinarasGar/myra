use business::loader::StartupLoader;
use std::env;
use tracing::info;

use crate::states::AppState;
use color_eyre::eyre::Result;

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
async fn main() -> Result<()> {
    color_eyre::install()?;

    //Initialize logging and OpenTelemetry
    observability::initialize_tracing_subscriber();

    //Load all dynamic enums
    StartupLoader::load_all().await.unwrap();

    //Create shared services instance, which contains a connection to a database
    let shared_state = AppState {
        services_collection: business::service_collection::Services::new().await.unwrap(),
    };

    //Initialize a router for the API
    let app = routes::create_router(shared_state).fallback(fallback::handler_404);

    // Run the WebServer
    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| "5000".to_string())
        .parse::<u16>()
        .unwrap_or(5000);

    let bind_address = format!("127.0.0.1:{}", port);
    let listener = tokio::net::TcpListener::bind(&bind_address).await.unwrap();
    info!("Starting web server on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
