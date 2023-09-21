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

use crate::database_connection::MyraDbConnection;

#[derive(Clone)]
pub struct MyraDb {
    pool: PgPool,
    transaction: Arc<AsyncMutex<Option<Transaction<'static, Postgres>>>>,
}

impl MyraDb {
    pub fn new(connection: MyraDbConnection) -> MyraDb {
        Self {
            pool: connection.pool,
            transaction: Arc::new(AsyncMutex::new(None)),
        }
    }

    pub async fn get_connection(&self) -> anyhow::Result<PoolConnection<Postgres>> {
        let pool_conn = self.pool.acquire().await?;
        Ok(pool_conn)
    }

    pub async fn get_transaction(&self) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;

        if tx_guard.is_none() {
            let tx = self.pool.begin().await?;
            *tx_guard = Some(tx);
        }

        Ok(())
    }

    pub async fn commit_transaction(&self) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;

        if let Some(tx) = tx_guard.take() {
            tx.commit().await?;
        } else {
            // Handle the case where there is no transaction to commit
            return Err(sqlx::Error::Configuration(
                "No transaction to commit".into(),
            ));
        }

        Ok(())
    }

    pub async fn fetch_all_in_trans<T>(
        &self,
        sql: String,
        values: SqlxValues,
    ) -> Result<Vec<T>, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_as_with::<_, T, _>(&sql, values.clone())
                .fetch_all(&mut **tx)
                .instrument(debug_span!("fetch_all_in_trans", sql, ?values))
                .await?;
            Ok(rows)
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn fetch_all_in_trans_scalar(
        &self,
        sql: String,
        values: SqlxValues,
    ) -> Result<Vec<i32>, sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_scalar_with(&sql, values.clone())
                .fetch_all(&mut **tx)
                .instrument(debug_span!("fetch_all_in_trans_scalar", sql, ?values))
                .await?;
            Ok(rows)
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn fetch_one_in_trans<T>(
        &self,
        sql: String,
        values: SqlxValues,
    ) -> Result<T, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_as_with::<_, T, _>(&sql, values.clone())
                .fetch_one(&mut **tx)
                .instrument(debug_span!("fetch_one_in_trans", sql, ?values))
                .await?;
            Ok(rows)
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn execute_in_trans(
        &self,
        sql: String,
        values: SqlxValues,
    ) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            sqlx::query_with(&sql, values.clone())
                .execute(&mut **tx)
                .instrument(debug_span!("execute_in_trans", sql, ?values))
                .await?;
            Ok(())
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn fetch_all<T>(&self, sql: String, values: SqlxValues) -> Result<Vec<T>, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let rows = sqlx::query_as_with::<_, T, _>(&sql, values.clone())
            .fetch_all(&self.pool)
            .instrument(debug_span!("fetch_all", sql, ?values))
            .await?;
        Ok(rows)
    }

    pub async fn fetch_one<T>(&self, sql: String, values: SqlxValues) -> Result<T, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let rows = sqlx::query_as_with::<_, T, _>(&sql, values.clone())
            .fetch_one(&self.pool)
            .instrument(debug_span!("fetch_one", sql, ?values))
            .await?;
        Ok(rows)
    }

    pub async fn execute(&self, sql: String, values: SqlxValues) -> Result<(), sqlx::Error> {
        sqlx::query_with(&sql, values.clone())
            .execute(&self.pool)
            .instrument(debug_span!("execute", sql, ?values))
            .await?;

        Ok(())
    }
}
