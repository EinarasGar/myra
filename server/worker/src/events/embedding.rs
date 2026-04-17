use ai::config::AiConfig;
use ai::embedding::embed_text;
use anyhow::Result;
use business::service_collection::ai_embedding_service::AiEmbeddingService;
use business::service_collection::ServiceProviders;
use uuid::Uuid;

#[tracing::instrument(skip(providers, text), err)]
pub async fn handle_transaction(
    providers: &ServiceProviders,
    transaction_id: Uuid,
    text: &str,
) -> Result<()> {
    let svc = AiEmbeddingService::new(providers);
    let embedding = generate_embedding(text).await?;
    svc.store_transaction_embedding(transaction_id, embedding)
        .await
}

#[tracing::instrument(skip(providers, text), err)]
pub async fn handle_group(providers: &ServiceProviders, group_id: Uuid, text: &str) -> Result<()> {
    let svc = AiEmbeddingService::new(providers);
    let embedding = generate_embedding(text).await?;
    svc.store_group_embedding(group_id, embedding).await
}

#[tracing::instrument(skip(providers, text), err)]
pub async fn handle_asset(providers: &ServiceProviders, asset_id: i32, text: &str) -> Result<()> {
    let svc = AiEmbeddingService::new(providers);
    let embedding = generate_embedding(text).await?;
    svc.store_asset_embedding(asset_id, embedding).await
}

#[tracing::instrument(skip(providers, text), err)]
pub async fn handle_category(
    providers: &ServiceProviders,
    category_id: i32,
    text: &str,
) -> Result<()> {
    let svc = AiEmbeddingService::new(providers);
    let embedding = generate_embedding(text).await?;
    svc.store_category_embedding(category_id, embedding).await
}

async fn generate_embedding(text: &str) -> Result<Vec<f32>> {
    let config = AiConfig::try_from_env()?;
    let vec_f64 = embed_text(&config, text).await?;
    Ok(vec_f64.iter().map(|&x| x as f32).collect())
}
