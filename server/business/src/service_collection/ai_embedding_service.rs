#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::job_queue::JobQueueHandle;
use dal::queries::ai_queries;
use pgvector::Vector;
use uuid::Uuid;

use crate::jobs::MyraJob;

#[derive(Clone)]
pub struct AiEmbeddingService {
    db: MyraDb,
    queue: JobQueueHandle<MyraJob>,
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
            .push(MyraJob::EmbedTransaction {
                transaction_id,
                text,
            })
            .await
    }

    pub async fn enqueue_embed_group(&self, group_id: Uuid, text: String) -> anyhow::Result<()> {
        self.queue
            .push(MyraJob::EmbedTransactionGroup { group_id, text })
            .await
    }

    pub async fn enqueue_embed_asset(&self, asset_id: i32, text: String) -> anyhow::Result<()> {
        self.queue
            .push(MyraJob::EmbedAsset { asset_id, text })
            .await
    }

    pub async fn enqueue_embed_category(
        &self,
        category_id: i32,
        text: String,
    ) -> anyhow::Result<()> {
        self.queue
            .push(MyraJob::EmbedCategory { category_id, text })
            .await
    }

    #[tracing::instrument(skip(self, embedding), err)]
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

    #[tracing::instrument(skip(self, embedding), err)]
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

    #[tracing::instrument(skip(self, embedding), err)]
    pub async fn store_asset_embedding(
        &self,
        asset_id: i32,
        embedding: Vec<f32>,
    ) -> anyhow::Result<()> {
        let query = ai_queries::update_asset_embedding(asset_id, Vector::from(embedding));
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(skip(self, embedding), err)]
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
