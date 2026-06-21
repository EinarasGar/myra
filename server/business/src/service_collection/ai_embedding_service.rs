#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::job_queue::JobQueueHandle;
use dal::queries::ai_queries;
use pgvector::Vector;
use uuid::Uuid;

use crate::jobs::EmbeddingJob;

#[derive(Clone)]
pub struct AiEmbeddingService {
    db: MyraDb,
    queue: JobQueueHandle,
}

impl AiEmbeddingService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
            queue: providers.job_queue.clone(),
        }
    }

    pub async fn enqueue_embed_transaction(
        &self,
        transaction_id: Uuid,
        text: String,
    ) -> anyhow::Result<()> {
        self.queue
            .push(EmbeddingJob::Transaction {
                transaction_id,
                text,
            })
            .await
    }

    pub async fn enqueue_embed_group(&self, group_id: Uuid, text: String) -> anyhow::Result<()> {
        self.queue
            .push(EmbeddingJob::Group { group_id, text })
            .await
    }

    pub async fn enqueue_embed_asset(&self, asset_id: i32, text: String) -> anyhow::Result<()> {
        self.queue
            .push(EmbeddingJob::Asset { asset_id, text })
            .await
    }

    pub async fn enqueue_embed_category(
        &self,
        category_id: i32,
        text: String,
    ) -> anyhow::Result<()> {
        self.queue
            .push(EmbeddingJob::Category { category_id, text })
            .await
    }

    #[tracing::instrument(level = "debug", skip_all, fields(transaction_id = %transaction_id, dimensions = embedding.len()))]
    pub async fn store_transaction_embedding(
        &self,
        transaction_id: Uuid,
        embedding: Vec<f32>,
    ) -> anyhow::Result<()> {
        let query = ai_queries::update_transaction_description_embedding(
            transaction_id,
            Vector::from(embedding),
        );
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(group_id = %group_id, dimensions = embedding.len()))]
    pub async fn store_group_embedding(
        &self,
        group_id: Uuid,
        embedding: Vec<f32>,
    ) -> anyhow::Result<()> {
        let query =
            ai_queries::update_transaction_group_embedding(group_id, Vector::from(embedding));
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(asset_id = %asset_id, dimensions = embedding.len()))]
    pub async fn store_asset_embedding(
        &self,
        asset_id: i32,
        embedding: Vec<f32>,
    ) -> anyhow::Result<()> {
        let query = ai_queries::update_asset_embedding(asset_id, Vector::from(embedding));
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(category_id = %category_id, dimensions = embedding.len()))]
    pub async fn store_category_embedding(
        &self,
        category_id: i32,
        embedding: Vec<f32>,
    ) -> anyhow::Result<()> {
        let query = ai_queries::update_category_embedding(category_id, Vector::from(embedding));
        self.db.execute(query).await?;
        Ok(())
    }
}
