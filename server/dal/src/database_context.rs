use mockall::mock;
use sea_query_binder::SqlxValues;
use sqlx::{postgres::PgRow, FromRow, PgPool, Postgres, Transaction};

use anyhow::Result;
use std::sync::Arc;

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
    pub fn new(connection: MyraDbConnection) -> Self {
        Self {
            pool: connection.pool,
            transaction: Arc::new(AsyncMutex::new(None)),
        }
    }

    pub async fn start_transaction(&self) -> Result<(), sqlx::Error> {
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
        query: (String, SqlxValues),
    ) -> Result<Vec<T>, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_as_with::<_, T, _>(&query.0, query.1.clone())
                .fetch_all(&mut **tx)
                .instrument(debug_span!("fetch_all_in_trans", ?query))
                .await?;
            Ok(rows)
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn fetch_all_in_trans_scalar(
        &self,
        query: (String, SqlxValues),
    ) -> Result<Vec<i32>, sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_scalar_with(&query.0, query.1.clone())
                .fetch_all(&mut **tx)
                .instrument(debug_span!("fetch_all_in_trans_scalar", ?query))
                .await?;
            Ok(rows)
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn fetch_one_in_trans<T>(&self, query: (String, SqlxValues)) -> Result<T, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_as_with::<_, T, _>(&query.0, query.1.clone())
                .fetch_one(&mut **tx)
                .instrument(debug_span!("fetch_one_in_trans", ?query))
                .await?;
            Ok(rows)
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn execute_in_trans(&self, query: (String, SqlxValues)) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            sqlx::query_with(&query.0, query.1.clone())
                .execute(&mut **tx)
                .instrument(debug_span!("execute_in_trans", ?query))
                .await?;
            Ok(())
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    pub async fn fetch_all<T>(&self, query: (String, SqlxValues)) -> Result<Vec<T>, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let rows = sqlx::query_as_with::<_, T, _>(&query.0, query.1.clone())
            .fetch_all(&self.pool)
            .instrument(debug_span!("fetch_all", ?query))
            .await?;
        Ok(rows)
    }

    pub async fn fetch_one<T>(&self, query: (String, SqlxValues)) -> Result<T, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let rows = sqlx::query_as_with::<_, T, _>(&query.0, query.1.clone())
            .fetch_one(&self.pool)
            .instrument(debug_span!("fetch_one", ?query))
            .await?;
        Ok(rows)
    }

    pub async fn execute(&self, query: (String, SqlxValues)) -> Result<(), sqlx::Error> {
        sqlx::query_with(&query.0, query.1.clone())
            .execute(&self.pool)
            .instrument(debug_span!("execute", ?query))
            .await?;

        Ok(())
    }
}

mock! {
    pub MyraDb {
        pub fn new(connection: MyraDbConnection) -> Self;

        pub async fn start_transaction(&self) -> Result<(), sqlx::Error>;
        pub async fn commit_transaction(&self) -> Result<(), sqlx::Error>;
        pub async fn fetch_all_in_trans<T: 'static>(
            &self,
            query: (String, SqlxValues),
        ) -> Result<Vec<T>, sqlx::Error>;
        pub async fn fetch_all_in_trans_scalar(
            &self,
            query: (String, SqlxValues),
        ) -> Result<Vec<i32>, sqlx::Error>;
        pub async fn fetch_one_in_trans<T: 'static>(&self, query: (String, SqlxValues)) -> Result<T, sqlx::Error>;

        pub async fn execute_in_trans(&self, query: (String, SqlxValues)) -> Result<(), sqlx::Error>;

        pub async fn fetch_all<T: 'static>(&self, query: (String, SqlxValues)) -> Result<Vec<T>, sqlx::Error>;

        pub async fn fetch_one<T: 'static>(&self, query: (String, SqlxValues)) -> Result<T, sqlx::Error>;
        pub async fn execute(&self, query: (String, SqlxValues)) -> Result<(), sqlx::Error>;
    }

    impl Clone for MyraDb {
        fn clone(&self) -> Self;
    }
}
