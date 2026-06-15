use apalis::prelude::TaskSink;
use apalis_postgres::PostgresStorage;
use serde::{de::DeserializeOwned, Serialize};
use sqlx::PgPool;

#[derive(Clone)]
pub struct JobQueueHandle {
    pool: PgPool,
}

impl JobQueueHandle {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn run_migrations(pool: &PgPool) -> anyhow::Result<()> {
        let mut migrator = PostgresStorage::<(), (), ()>::migrations();
        migrator.set_ignore_missing(true);
        migrator.run(pool).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn push<T>(&self, job: T) -> anyhow::Result<()>
    where
        T: Serialize + DeserializeOwned + Send + Sync + Unpin + 'static,
    {
        let mut storage = PostgresStorage::<T>::new(&self.pool);
        storage.push(job).await?;
        Ok(())
    }
}
