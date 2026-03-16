use dal::database_context::MyraDb;
use dal::queries::ai_queries;
use pgvector::Vector;
use uuid::Uuid;

use ai::config::AiConfig;
use ai::embedding::embed_text;

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
            let result: anyhow::Result<()> = async {
                let config = AiConfig::try_from_env()?;
                let vec = embed_text(&config, &description).await?;
                let vector = Vector::from(vec.iter().map(|&x| x as f32).collect::<Vec<f32>>());
                let query =
                    ai_queries::update_transaction_description_embedding(transaction_id, vector);
                db.execute(query).await?;
                tracing::info!("Embedded transaction {}", transaction_id);
                Ok(())
            }
            .await;

            if let Err(e) = result {
                tracing::error!("Failed to embed transaction {}: {}", transaction_id, e);
            }
        });
    }

    pub fn spawn_embed_group(&self, group_id: Uuid, description: String) {
        let db = self.db.clone();
        tokio::spawn(async move {
            let result: anyhow::Result<()> = async {
                let config = AiConfig::try_from_env()?;
                let vec = embed_text(&config, &description).await?;
                let vector = Vector::from(vec.iter().map(|&x| x as f32).collect::<Vec<f32>>());
                let query = ai_queries::update_transaction_group_embedding(group_id, vector);
                db.execute(query).await?;
                tracing::info!("Embedded group {}", group_id);
                Ok(())
            }
            .await;

            if let Err(e) = result {
                tracing::error!("Failed to embed group {}: {}", group_id, e);
            }
        });
    }
}
