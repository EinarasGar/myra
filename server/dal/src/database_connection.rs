use std::str::FromStr;

use sea_query_binder::SqlxValues;
use sqlx::{
    pool::PoolConnection,
    postgres::{PgConnectOptions, PgPoolOptions, PgRow},
    ConnectOptions, FromRow, PgPool, Postgres, Transaction,
};

use anyhow::Result;
use std::sync::Arc;
use std::sync::Mutex;
use tokio::sync::Mutex as AsyncMutex;
use tracing::debug_span;
use tracing::Instrument;

#[derive(Clone)]
pub struct MyraDbConnection {
    pub pool: PgPool,
}

impl MyraDbConnection {
    pub async fn new() -> anyhow::Result<Self> {
        let connection_string = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let connection_options = PgConnectOptions::from_str(&connection_string)
            .expect("Unable to parse DATABASE_URL connection string")
            .log_statements(tracing::log::LevelFilter::Debug);

        let pool: PgPool = PgPoolOptions::new()
            .max_connections(5)
            .connect_with(connection_options)
            .await
            .expect("can't connect to database");

        Ok(Self { pool })
    }
}
