use std::sync::Arc;

use super::ToolError;
use crate::data_provider::AiDataProvider;
use crate::embedding::embed_query;
use crate::models::tool_output::SearchCategoriesArgs;
use rig::{completion::request::ToolDefinition, embeddings::EmbeddingModel, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct SearchCategoriesTool<M: EmbeddingModel, D: AiDataProvider> {
    data: Arc<D>,
    user_id: Uuid,
    embedding_model: M,
}

impl<M: EmbeddingModel, D: AiDataProvider> SearchCategoriesTool<M, D> {
    pub fn new(data: Arc<D>, user_id: Uuid, embedding_model: M) -> Self {
        Self {
            data,
            user_id,
            embedding_model,
        }
    }
}

impl<M: EmbeddingModel + Send + Sync, D: AiDataProvider> Tool for SearchCategoriesTool<M, D> {
    const NAME: &'static str = "search_categories";

    type Error = ToolError;
    type Args = SearchCategoriesArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Search transaction categories. Supports semantic search (e.g. 'grocery store purchase' finds Groceries). When no query is provided, returns all categories.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional natural language query to find relevant categories (e.g. 'grocery store', 'monthly rent', 'dining out')"
                    }
                },
                "required": []
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let query_vec = if let Some(ref q) = args.query {
            Some(
                embed_query(&self.embedding_model, q)
                    .await
                    .map_err(|e| ToolError(e.to_string()))?,
            )
        } else {
            None
        };

        let categories = self
            .data
            .search_categories(self.user_id, query_vec)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        serde_json::to_string(&categories).map_err(Into::into)
    }
}
