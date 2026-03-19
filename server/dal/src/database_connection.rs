use std::str::FromStr;

use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    ConnectOptions, PgPool,
};

#[derive(Clone)]
pub struct MyraDbConnection {
    pub pool: PgPool,
}

impl MyraDbConnection {
    pub async fn new() -> anyhow::Result<Self> {
        let connection_string = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            let user = std::env::var("POSTGRES_USER").unwrap_or_else(|_| "myradev".into());
            let password =
                std::env::var("POSTGRES_PASSWORD").unwrap_or_else(|_| "devpassword".into());
            let port = std::env::var("POSTGRES_PORT").unwrap_or_else(|_| "5432".into());
            let db = std::env::var("POSTGRES_DB").unwrap_or_else(|_| "myra".into());
            format!("postgres://{user}:{password}@localhost:{port}/{db}")
        });
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

    pub async fn run_migrations(&self) -> anyhow::Result<()> {
        let mut migrator = sqlx::migrate!("../../database/migrations");
        let pending = migrator.iter().len();
        tracing::info!("Running schema migrations ({pending} registered)...");
        migrator.set_ignore_missing(true).run(&self.pool).await?;
        tracing::info!("Schema migrations complete.");
        Ok(())
    }

    pub async fn run_sample_seed(&self) -> anyhow::Result<()> {
        tracing::info!("Running sample seed migrations...");
        sqlx::migrate!("../../database/seed/sample")
            .set_ignore_missing(true)
            .run(&self.pool)
            .await?;
        tracing::info!("Sample seed migrations complete.");
        Ok(())
    }

    pub async fn run_noauth_seed(&self) -> anyhow::Result<()> {
        tracing::info!("Running noauth seed migrations...");
        sqlx::migrate!("../../database/seed/noauth")
            .set_ignore_missing(true)
            .run(&self.pool)
            .await?;
        tracing::info!("Noauth seed migrations complete.");
        Ok(())
    }
}
