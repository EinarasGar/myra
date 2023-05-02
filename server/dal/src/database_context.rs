use std::str::FromStr;

use sqlx::{
    pool::PoolConnection,
    postgres::{PgConnectOptions, PgPoolOptions},
    ConnectOptions, PgPool, Postgres, Transaction,
};

#[derive(Clone)]
pub struct MyraDb {
    pool: PgPool,
}

impl MyraDb {
    pub async fn new() -> anyhow::Result<Self> {
        let connection_string = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let mut connection_options = PgConnectOptions::from_str(&connection_string)
            .expect("Unable to parse DATABASE_URL connection string");

        connection_options.log_statements(tracing::log::LevelFilter::Debug);

        let pool: PgPool = PgPoolOptions::new()
            .max_connections(5)
            .connect_with(connection_options)
            .await
            .expect("can't connect to database");

        Ok(Self { pool })
    }

    pub async fn get_connection(&self) -> anyhow::Result<PoolConnection<Postgres>> {
        let pool_conn = self.pool.acquire().await?;
        Ok(pool_conn)
    }

    pub async fn get_transaction(&self) -> anyhow::Result<Transaction<Postgres>> {
        let pool_conn = self.pool.begin().await?;
        Ok(pool_conn)
    }
}
