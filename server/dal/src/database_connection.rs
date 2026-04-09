use std::path::Path;
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

    pub async fn run_asset_seed(&self) -> anyhow::Result<()> {
        let seed_dir = Path::new("../database/seed/raw-data/assets");
        let assets_csv = seed_dir.join("assets.csv");
        let pairs_csv = seed_dir.join("pairs.csv");

        if !assets_csv.exists() {
            tracing::warn!(
                "Asset seed file not found at {}. Skipping asset seed.",
                assets_csv.display()
            );
            return Ok(());
        }

        let has_assets: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM assets WHERE asset_type NOT IN (1))")
                .fetch_one(&self.pool)
                .await?;

        if has_assets {
            tracing::info!("Assets already seeded. Skipping asset seed.");
            return Ok(());
        }

        tracing::info!("Seeding assets from CSV...");
        let mut conn = self.pool.acquire().await?;

        // Import assets
        sqlx::query(
            "CREATE TEMP TABLE tmp_assets (
                ticker TEXT,
                asset_name TEXT,
                asset_type_id INT,
                isin TEXT,
                base_currency TEXT
            )",
        )
        .execute(&mut *conn)
        .await?;

        let csv_data = std::fs::read(&assets_csv)?;
        let mut copy = conn
            .copy_in_raw(
                "COPY tmp_assets (ticker, asset_name, asset_type_id, isin, base_currency) FROM STDIN WITH (FORMAT csv)",
            )
            .await?;
        copy.send(csv_data).await?;
        copy.finish().await?;

        let inserted_assets = sqlx::query_scalar::<_, i32>(
            "INSERT INTO assets (asset_type, asset_name, ticker, isin, base_pair_id)
             SELECT t.asset_type_id, t.asset_name, t.ticker, NULLIF(t.isin, ''), c.id
             FROM tmp_assets t
             LEFT JOIN assets c ON c.ticker = t.base_currency
             ON CONFLICT (ticker) DO NOTHING
             RETURNING id",
        )
        .fetch_all(&mut *conn)
        .await?;

        sqlx::query("DROP TABLE tmp_assets")
            .execute(&mut *conn)
            .await?;

        // Import pairs if file exists
        let mut inserted_pairs_count = 0;
        if pairs_csv.exists() {
            sqlx::query(
                "CREATE TEMP TABLE tmp_pairs (
                    asset_ticker TEXT,
                    quote_ticker TEXT
                )",
            )
            .execute(&mut *conn)
            .await?;

            let pairs_data = std::fs::read(&pairs_csv)?;
            let mut copy = conn
                .copy_in_raw(
                    "COPY tmp_pairs (asset_ticker, quote_ticker) FROM STDIN WITH (FORMAT csv)",
                )
                .await?;
            copy.send(pairs_data).await?;
            copy.finish().await?;

            let inserted_pairs = sqlx::query_scalar::<_, i32>(
                "INSERT INTO asset_pairs (pair1, pair2)
                 SELECT a.id, q.id
                 FROM tmp_pairs t
                 JOIN assets a ON a.ticker = t.asset_ticker
                 JOIN assets q ON q.ticker = t.quote_ticker
                 ON CONFLICT (pair1, pair2) DO NOTHING
                 RETURNING id",
            )
            .fetch_all(&mut *conn)
            .await?;

            inserted_pairs_count = inserted_pairs.len();

            sqlx::query("DROP TABLE tmp_pairs")
                .execute(&mut *conn)
                .await?;
        }

        tracing::info!(
            "Asset seed complete. {} assets, {} pairs inserted.",
            inserted_assets.len(),
            inserted_pairs_count
        );

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
