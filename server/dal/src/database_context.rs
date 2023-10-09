use mockall::mock;
use sqlx::{postgres::PgRow, FromRow, PgPool, Postgres, Transaction};

use anyhow::Result;
use std::sync::Arc;

use tokio::sync::Mutex as AsyncMutex;

use crate::database_connection::MyraDbConnection;
use crate::db_sets::DbQueryWithValues;

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

    #[tracing::instrument(skip(self), err)]
    pub async fn start_transaction(&self) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;

        if tx_guard.is_none() {
            let tx = self.pool.begin().await?;
            *tx_guard = Some(tx);
        }

        Ok(())
    }

    #[tracing::instrument(skip(self), err)]
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

    #[tracing::instrument(skip(self), err)]
    pub async fn fetch_all<T>(&self, query: DbQueryWithValues) -> Result<Vec<T>, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_all(&mut **tx)
                .await?;
            Ok(rows)
        } else {
            let rows = sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_all(&self.pool)
                .await?;
            Ok(rows)
        }
    }

    #[tracing::instrument(skip(self), err)]
    pub async fn fetch_all_scalar(
        &self,
        query: DbQueryWithValues,
    ) -> Result<Vec<i32>, sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_scalar_with(&query.query, query.values)
                .fetch_all(&mut **tx)
                .await?;
            Ok(rows)
        } else {
            Err(sqlx::Error::Configuration("No transaction to use".into()))
        }
    }

    #[tracing::instrument(skip(self), err)]
    pub async fn fetch_one<T>(&self, query: DbQueryWithValues) -> Result<T, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            let rows = sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_one(&mut **tx)
                .await?;
            Ok(rows)
        } else {
            let rows = sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_one(&self.pool)
                .await?;
            Ok(rows)
        }
    }

    #[tracing::instrument(skip(self), err)]
    pub async fn execute(&self, query: DbQueryWithValues) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;
        if let Some(ref mut tx) = &mut *tx_guard {
            sqlx::query_with(&query.query, query.values)
                .execute(&mut **tx)
                .await?;
            Ok(())
        } else {
            sqlx::query_with(&query.query, query.values)
                .execute(&self.pool)
                .await?;

            Ok(())
        }
    }
}

mock! {
    pub MyraDb {
        pub fn new(connection: MyraDbConnection) -> Self;

        pub async fn start_transaction(&self) -> Result<(), sqlx::Error>;
        pub async fn commit_transaction(&self) -> Result<(), sqlx::Error>;
        pub async fn fetch_all<T: 'static>(
            &self,
            query: DbQueryWithValues,
        ) -> Result<Vec<T>, sqlx::Error>;
        pub async fn fetch_all_scalar(
            &self,
            query: DbQueryWithValues,
        ) -> Result<Vec<i32>, sqlx::Error>;
        pub async fn fetch_one<T: 'static>(&self, query: DbQueryWithValues) -> Result<T, sqlx::Error>;
        pub async fn execute(&self, query: DbQueryWithValues) -> Result<(), sqlx::Error>;
    }

    impl Clone for MyraDb {
        fn clone(&self) -> Self;
    }
}
