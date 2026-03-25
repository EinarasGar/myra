use dal::database_context::MyraDb;
use dal::queries::ai_queries;
use pgvector::Vector;
use uuid::Uuid;

use ai::config::AiConfig;
use ai::embedding::embed_text;

use dal::queries::DbQueryWithValues;

pub struct AiEmbeddingService {
    db: MyraDb,
}

impl AiEmbeddingService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    pub fn spawn_embed_transaction(&self, transaction_id: Uuid, description: String) {
        let db = self.db.clone();
        tokio::spawn(async move {
            let query_fn = |embedding| {
                ai_queries::update_transaction_description_embedding(transaction_id, embedding)
            };
            if let Err(e) = embed_and_store(&db, &description, query_fn).await {
                tracing::error!("Failed to embed transaction {}: {}", transaction_id, e);
            }
        });
    }

    pub fn spawn_embed_group(&self, group_id: Uuid, description: String) {
        let db = self.db.clone();
        tokio::spawn(async move {
            let query_fn =
                |embedding| ai_queries::update_transaction_group_embedding(group_id, embedding);
            if let Err(e) = embed_and_store(&db, &description, query_fn).await {
                tracing::error!("Failed to embed group {}: {}", group_id, e);
            }
        });
    }

    pub fn spawn_embed_asset(&self, asset_id: i32, text: String) {
        let db = self.db.clone();
        tokio::spawn(async move {
            let query_fn = |embedding| ai_queries::update_asset_embedding(asset_id, embedding);
            if let Err(e) = embed_and_store(&db, &text, query_fn).await {
                tracing::error!("Failed to embed asset {}: {}", asset_id, e);
            }
        });
    }

    pub async fn embed_asset(&self, asset_id: i32, text: &str) -> anyhow::Result<()> {
        let query_fn = |embedding| ai_queries::update_asset_embedding(asset_id, embedding);
        embed_and_store(&self.db, text, query_fn).await
    }

    pub fn spawn_embed_category(&self, category_id: i32, text: String) {
        let db = self.db.clone();
        tokio::spawn(async move {
            let query_fn =
                |embedding| ai_queries::update_category_embedding(category_id, embedding);
            if let Err(e) = embed_and_store(&db, &text, query_fn).await {
                tracing::error!("Failed to embed category {}: {}", category_id, e);
            }
        });
    }
}

async fn embed_and_store(
    db: &MyraDb,
    text: &str,
    query_fn: impl FnOnce(Vector) -> DbQueryWithValues,
) -> anyhow::Result<()> {
    let config = AiConfig::try_from_env()?;
    let vec = embed_text(&config, text).await?;
    let vector = Vector::from(vec.iter().map(|&x| x as f32).collect::<Vec<f32>>());
    let query = query_fn(vector);
    db.execute(query).await?;
    tracing::info!("Stored embedding ({} chars)", text.len());
    Ok(())
}
