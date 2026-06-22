use mockall::mock;
use sqlx::postgres::PgPoolCopyExt;
use sqlx::{postgres::PgRow, FromRow, PgPool, Postgres, Transaction};

use anyhow::Result;
use std::sync::Arc;

use tokio::sync::Mutex as AsyncMutex;

use crate::database_connection::MyraDbConnection;
use crate::queries::{DbCopyCommand, DbQueryWithValues};

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

    #[tracing::instrument(level = "debug", skip_all)]
    pub async fn start_transaction(&self) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;

        if tx_guard.is_none() {
            let tx = self.pool.begin().await?;
            *tx_guard = Some(tx);
        }

        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all)]
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

    #[tracing::instrument(level = "debug", skip_all)]
    pub async fn rollback_transaction(&self) -> Result<(), sqlx::Error> {
        let mut tx_guard = self.transaction.lock().await;

        if let Some(tx) = tx_guard.take() {
            tx.rollback().await?;
        } else {
            // Handle the case where there is no transaction to commit
            return Err(sqlx::Error::Configuration(
                "No transaction to rollback".into(),
            ));
        }
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(otel.name = %query.display_name(), otel.kind = "client", db.system.name = "postgresql", db.query.text = tracing::field::Empty, db.response.returned_rows = tracing::field::Empty))]
    pub async fn fetch_all<T>(&self, query: DbQueryWithValues) -> Result<Vec<T>, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let span = tracing::Span::current();
        if tracing::enabled!(tracing::Level::TRACE) {
            span.record("db.query.text", query.query.as_str());
        }

        let mut tx_guard = self.transaction.lock().await;
        let rows = if let Some(mut tx) = tx_guard.take() {
            match sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_all(&mut *tx)
                .await
            {
                Ok(rows) => {
                    *tx_guard = Some(tx);
                    rows
                }
                Err(e) => return Err(rollback_on_error(tx, e).await),
            }
        } else {
            sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_all(&self.pool)
                .await?
        };
        span.record("db.response.returned_rows", rows.len());
        Ok(rows)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(otel.name = %query.display_name(), otel.kind = "client", db.system.name = "postgresql", db.query.text = tracing::field::Empty, db.response.returned_rows = tracing::field::Empty))]
    pub async fn fetch_all_scalar<T>(&self, query: DbQueryWithValues) -> Result<Vec<T>, sqlx::Error>
    where
        for<'r> T: Send + Unpin + sqlx::Decode<'r, Postgres> + sqlx::Type<Postgres>,
    {
        let span = tracing::Span::current();
        if tracing::enabled!(tracing::Level::TRACE) {
            span.record("db.query.text", query.query.as_str());
        }

        let mut tx_guard = self.transaction.lock().await;
        let rows = if let Some(mut tx) = tx_guard.take() {
            match sqlx::query_scalar_with::<_, T, _>(&query.query, query.values)
                .fetch_all(&mut *tx)
                .await
            {
                Ok(rows) => {
                    *tx_guard = Some(tx);
                    rows
                }
                Err(e) => return Err(rollback_on_error(tx, e).await),
            }
        } else {
            sqlx::query_scalar_with::<_, T, _>(&query.query, query.values)
                .fetch_all(&self.pool)
                .await?
        };
        span.record("db.response.returned_rows", rows.len());
        Ok(rows)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(otel.name = %query.display_name(), otel.kind = "client", db.system.name = "postgresql", db.query.text = tracing::field::Empty, db.response.returned_rows = tracing::field::Empty))]
    pub async fn fetch_one<T>(&self, query: DbQueryWithValues) -> Result<T, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let span = tracing::Span::current();
        if tracing::enabled!(tracing::Level::TRACE) {
            span.record("db.query.text", query.query.as_str());
        }

        let mut tx_guard = self.transaction.lock().await;
        let row = if let Some(mut tx) = tx_guard.take() {
            match sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_one(&mut *tx)
                .await
            {
                Ok(row) => {
                    *tx_guard = Some(tx);
                    row
                }
                Err(e) => return Err(rollback_on_error(tx, e).await),
            }
        } else {
            sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_one(&self.pool)
                .await?
        };
        span.record("db.response.returned_rows", 1);
        Ok(row)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(otel.name = %query.display_name(), otel.kind = "client", db.system.name = "postgresql", db.query.text = tracing::field::Empty, db.response.returned_rows = tracing::field::Empty))]
    pub async fn fetch_one_scalar<T>(&self, query: DbQueryWithValues) -> Result<T, sqlx::Error>
    where
        for<'r> T: Send + Unpin + sqlx::Decode<'r, Postgres> + sqlx::Type<Postgres>,
    {
        let span = tracing::Span::current();
        if tracing::enabled!(tracing::Level::TRACE) {
            span.record("db.query.text", query.query.as_str());
        }

        let mut tx_guard = self.transaction.lock().await;
        let row = if let Some(mut tx) = tx_guard.take() {
            match sqlx::query_scalar_with::<_, T, _>(&query.query, query.values)
                .fetch_one(&mut *tx)
                .await
            {
                Ok(row) => {
                    *tx_guard = Some(tx);
                    row
                }
                Err(e) => return Err(rollback_on_error(tx, e).await),
            }
        } else {
            sqlx::query_scalar_with::<_, T, _>(&query.query, query.values)
                .fetch_one(&self.pool)
                .await?
        };
        span.record("db.response.returned_rows", 1);
        Ok(row)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(otel.name = %query.display_name(), otel.kind = "client", db.system.name = "postgresql", db.query.text = tracing::field::Empty, db.response.returned_rows = tracing::field::Empty))]
    pub async fn fetch_optional<T>(
        &self,
        query: DbQueryWithValues,
    ) -> Result<Option<T>, sqlx::Error>
    where
        for<'r> T: FromRow<'r, PgRow> + Send + Unpin,
    {
        let span = tracing::Span::current();
        if tracing::enabled!(tracing::Level::TRACE) {
            span.record("db.query.text", query.query.as_str());
        }

        let mut tx_guard = self.transaction.lock().await;
        let result = if let Some(mut tx) = tx_guard.take() {
            match sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_optional(&mut *tx)
                .await
            {
                Ok(row) => {
                    *tx_guard = Some(tx);
                    row
                }
                Err(e) => return Err(rollback_on_error(tx, e).await),
            }
        } else {
            sqlx::query_as_with::<_, T, _>(&query.query, query.values)
                .fetch_optional(&self.pool)
                .await?
        };
        span.record("db.response.returned_rows", result.is_some() as i64);
        Ok(result)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(otel.name = %query.display_name(), otel.kind = "client", db.system.name = "postgresql", db.query.text = tracing::field::Empty, db.response.returned_rows = tracing::field::Empty))]
    pub async fn execute(&self, query: DbQueryWithValues) -> Result<(), sqlx::Error> {
        let span = tracing::Span::current();
        span.record("db.response.returned_rows", 0);
        if tracing::enabled!(tracing::Level::TRACE) {
            span.record("db.query.text", query.query.as_str());
        }

        let mut tx_guard = self.transaction.lock().await;
        if let Some(mut tx) = tx_guard.take() {
            match sqlx::query_with(&query.query, query.values)
                .execute(&mut *tx)
                .await
            {
                Ok(_) => {
                    *tx_guard = Some(tx);
                }
                Err(e) => return Err(rollback_on_error(tx, e).await),
            }
        } else {
            sqlx::query_with(&query.query, query.values)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all)]
    pub async fn copy_in(&self, command: DbCopyCommand) -> Result<u64, sqlx::Error> {
        let mut copy = self.pool.copy_in_raw(&command.statement).await?;
        copy.send(command.csv_data.as_slice()).await?;
        let rows = copy.finish().await?;
        Ok(rows)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(otel.name = %query.display_name(), otel.kind = "client", db.system.name = "postgresql", db.query.text = tracing::field::Empty, db.response.returned_rows = tracing::field::Empty))]
    pub async fn execute_with_rows_affected(
        &self,
        query: DbQueryWithValues,
    ) -> Result<u64, sqlx::Error> {
        let span = tracing::Span::current();
        if tracing::enabled!(tracing::Level::TRACE) {
            span.record("db.query.text", query.query.as_str());
        }

        let mut tx_guard = self.transaction.lock().await;
        let rows_affected = if let Some(mut tx) = tx_guard.take() {
            match sqlx::query_with(&query.query, query.values)
                .execute(&mut *tx)
                .await
            {
                Ok(result) => {
                    *tx_guard = Some(tx);
                    result.rows_affected()
                }
                Err(e) => return Err(rollback_on_error(tx, e).await),
            }
        } else {
            sqlx::query_with(&query.query, query.values)
                .execute(&self.pool)
                .await?
                .rows_affected()
        };
        span.record("db.response.returned_rows", rows_affected);
        Ok(rows_affected)
    }
}

/// Rolls back a transaction whose statement just failed, then returns the
/// original error. Postgres aborts the transaction on the first error, so the
/// handle would otherwise stay poisoned ("current transaction is aborted")
/// for every subsequent query sharing this `MyraDb` within the request.
async fn rollback_on_error(
    tx: Transaction<'static, Postgres>,
    err: sqlx::Error,
) -> sqlx::Error {
    if let Err(rollback_err) = tx.rollback().await {
        tracing::warn!(error = %rollback_err, "failed to roll back aborted transaction");
    }
    err
}

mock! {
    pub MyraDb {
        pub fn new(connection: MyraDbConnection) -> Self;

        pub async fn start_transaction(&self) -> Result<(), sqlx::Error>;
        pub async fn commit_transaction(&self) -> Result<(), sqlx::Error>;
        pub async fn rollback_transaction(&self) -> Result<(), sqlx::Error>;
        pub async fn fetch_all<T: 'static>(
            &self,
            query: DbQueryWithValues,
        ) -> Result<Vec<T>, sqlx::Error>;
        pub async fn fetch_all_scalar<T: 'static>(
            &self,
            query: DbQueryWithValues,
        ) -> Result<Vec<T>, sqlx::Error>;
        pub async fn fetch_one<T: 'static>(&self, query: DbQueryWithValues) -> Result<T, sqlx::Error>;
        pub async fn fetch_one_scalar<T: 'static>(&self, query: DbQueryWithValues) -> Result<T, sqlx::Error>;
        pub async fn fetch_optional<T: 'static>(&self, query: DbQueryWithValues) -> Result<Option<T>, sqlx::Error>;
        pub async fn execute(&self, query: DbQueryWithValues) -> Result<(), sqlx::Error>;
        pub async fn execute_with_rows_affected(&self, query: DbQueryWithValues) -> Result<u64, sqlx::Error>;
        pub async fn copy_in(&self, command: DbCopyCommand) -> Result<u64, sqlx::Error>;
    }

    impl Clone for MyraDb {
        fn clone(&self) -> Self;
    }
}
