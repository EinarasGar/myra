use std::env;

#[derive(Clone)]
pub struct AiConfig {
    pub api_key: String,
    pub model: String,
    pub embedding_model: String,
}

impl AiConfig {
    pub fn try_from_env() -> anyhow::Result<Self> {
        let api_key = env::var("AI_API_KEY").map_err(|_| anyhow::anyhow!("AI_API_KEY not set"))?;
        let model = env::var("AI_MODEL").map_err(|_| anyhow::anyhow!("AI_MODEL not set"))?;
        let embedding_model = env::var("AI_EMBEDDING_MODEL")
            .map_err(|_| anyhow::anyhow!("AI_EMBEDDING_MODEL not set"))?;

        if api_key.is_empty() {
            return Err(anyhow::anyhow!("AI_API_KEY is empty"));
        }
        if model.is_empty() {
            return Err(anyhow::anyhow!("AI_MODEL is empty"));
        }
        if embedding_model.is_empty() {
            return Err(anyhow::anyhow!("AI_EMBEDDING_MODEL is empty"));
        }

        Ok(Self {
            api_key,
            model,
            embedding_model,
        })
    }
}
