use ai::config::AiConfig;
use ai::embedding::embed_text;
use async_trait::async_trait;
use business::jobs::EmbeddingJob;
use business::service_collection::ai_embedding_service::AiEmbeddingService;
use business::service_collection::ServiceProviders;

use crate::jobs::WorkerJob;
use crate::retry::RetryPolicy;

#[async_trait]
impl WorkerJob for EmbeddingJob {
    const NAME: &'static str = "embedding";

    fn retry_policy() -> RetryPolicy {
        RetryPolicy::fire_and_forget()
    }

    #[tracing::instrument(skip_all, err)]
    async fn run(&self, providers: &ServiceProviders) -> anyhow::Result<()> {
        let svc = AiEmbeddingService::new(providers);
        match self {
            EmbeddingJob::Transaction {
                transaction_id,
                text,
            } => {
                let embedding = generate_embedding(text).await?;
                svc.store_transaction_embedding(*transaction_id, embedding)
                    .await
            }
            EmbeddingJob::Group { group_id, text } => {
                let embedding = generate_embedding(text).await?;
                svc.store_group_embedding(*group_id, embedding).await
            }
            EmbeddingJob::Asset { asset_id, text } => {
                let embedding = generate_embedding(text).await?;
                svc.store_asset_embedding(*asset_id, embedding).await
            }
            EmbeddingJob::Category { category_id, text } => {
                let embedding = generate_embedding(text).await?;
                svc.store_category_embedding(*category_id, embedding).await
            }
        }
    }
}

#[tracing::instrument(skip_all, err, fields(text_len = text.len()))]
async fn generate_embedding(text: &str) -> anyhow::Result<Vec<f32>> {
    let config = AiConfig::try_from_env()?;
    let vec_f64 = embed_text(&config, text).await?;
    Ok(vec_f64.iter().map(|&x| x as f32).collect())
}
