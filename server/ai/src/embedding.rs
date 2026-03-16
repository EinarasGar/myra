use anyhow::Result;
use rig::client::EmbeddingsClient;
use rig::embeddings::EmbeddingModel;

use crate::config::AiConfig;
use crate::provider::create_gemini_client;

pub const EMBEDDING_DIMS: usize = 1536;

pub async fn embed_query<M: EmbeddingModel>(model: &M, text: &str) -> Result<Vec<f64>> {
    let embedding = model.embed_text(text).await?;
    Ok(embedding.vec)
}

pub async fn embed_text(config: &AiConfig, text: &str) -> Result<Vec<f64>> {
    let client = create_gemini_client(&config.api_key);
    let model = client.embedding_model_with_ndims(&config.embedding_model, EMBEDDING_DIMS);
    embed_query(&model, text).await
}
