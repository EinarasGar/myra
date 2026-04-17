use apalis::prelude::Storage;
use apalis_sql::postgres::PostgresStorage;
use serde::{de::DeserializeOwned, Serialize};
use sqlx::PgPool;

#[derive(Clone)]
pub struct JobQueueHandle<J>
where
    J: Serialize + DeserializeOwned + Send + Sync + Unpin + 'static,
{
    storage: PostgresStorage<J>,
}

impl<J> JobQueueHandle<J>
where
    J: Serialize + DeserializeOwned + Send + Sync + Unpin + 'static,
{
    pub fn new(pool: PgPool) -> Self {
        Self {
            storage: PostgresStorage::new(pool),
        }
    }

    pub async fn run_migrations(pool: &PgPool) -> anyhow::Result<()> {
        let mut migrator = PostgresStorage::<()>::migrations();
        migrator.set_ignore_missing(true).run(pool).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn push(&self, job: J) -> anyhow::Result<()> {
        let mut storage = self.storage.clone();
        storage.push(job).await?;
        Ok(())
    }

    pub fn storage(&self) -> PostgresStorage<J> {
        self.storage.clone()
    }
}
