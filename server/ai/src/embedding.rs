use rig::client::EmbeddingsClient;
use rig::embeddings::EmbeddingModel;

use crate::config::AiConfig;
use crate::models::error::AiError;
use crate::provider::create_gemini_client;

pub const EMBEDDING_DIMS: usize = 1536;

#[tracing::instrument(skip_all, level = "debug", fields(text_len = text.len(), otel.kind = "client"))]
pub async fn embed_query<M: EmbeddingModel>(model: &M, text: &str) -> Result<Vec<f64>, AiError> {
    let embedding = model.embed_text(text).await.map_err(AiError::from)?;
    Ok(embedding.vec)
}

#[tracing::instrument(skip_all, level = "debug", fields(text_len = text.len(), otel.kind = "client"))]
pub async fn embed_text(config: &AiConfig, text: &str) -> Result<Vec<f64>, AiError> {
    let client = create_gemini_client(&config.api_key);
    let model = client.embedding_model_with_ndims(&config.embedding_model, EMBEDDING_DIMS);
    embed_query(&model, text).await
}
