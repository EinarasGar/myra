use business::loader::StartupLoader;
use std::{env, net::SocketAddr};
use tracing::info;

use crate::states::AppState;
use color_eyre::eyre::Result;

pub mod auth;
mod auth_feature_check;
pub(crate) mod auth_middleware;
pub mod converters;
pub mod errors;
pub mod extractors;
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
    // Generate OpenAPI spec to stdout and exit (no DB/server needed)
    if env::args().any(|arg| arg == "--openapi") {
        let json = openapi::build_openapi_json();
        print!("{}", json);
        return Ok(());
    }

    dotenvy::dotenv().ok();
    color_eyre::install()?;

    //Initialize logging and OpenTelemetry
    observability::initialize_tracing_subscriber();

    // Run database migrations and feature-gated seed data
    {
        let db = dal::database_connection::MyraDbConnection::new()
            .await
            .unwrap();
        db.run_migrations().await.unwrap();

        #[cfg(feature = "seed")]
        db.run_sample_seed().await.unwrap();

        #[cfg(feature = "seed")]
        db.run_asset_seed().await.unwrap();

        #[cfg(feature = "noauth")]
        db.run_noauth_seed().await.unwrap();
    }

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

    let bind_host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let bind_address = format!("{}:{}", bind_host, port);
    let listener = tokio::net::TcpListener::bind(&bind_address).await.unwrap();
    info!("Starting web server on {}", listener.local_addr().unwrap());
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();

    Ok(())
}
