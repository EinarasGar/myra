use std::net::SocketAddr;

use log::info;
use tokio;

use tracing_subscriber::{prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt};

use crate::states::AppState;

pub(crate) mod app_error;
mod fallback;
pub(crate) mod handlers;
pub(crate) mod models;
pub(crate) mod routes;
pub(crate) mod states;

#[tokio::main]
async fn main() {
    // Enable trace logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let shared_state = AppState {
        serivces_collection: business::service_collection::Services::new().await.unwrap(),
    };

    let app = routes::create_router(shared_state).fallback(fallback::handler_404);

    // Run the webserver
    let addr = SocketAddr::from(([0, 0, 0, 0], 5000));
    info!("Starting web server on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
