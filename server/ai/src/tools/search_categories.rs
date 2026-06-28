use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::embedding::embed_query;
use crate::models::tool_output::SearchCategoriesArgs;
use rig::{completion::request::ToolDefinition, embeddings::EmbeddingModel, tool::Tool};
use serde_json::json;

pub struct SearchCategoriesTool<M: EmbeddingModel, D: AiDataProvider> {
    data: Arc<D>,
    embedding_model: M,
    mode: ToolMode,
}

impl<M: EmbeddingModel, D: AiDataProvider> SearchCategoriesTool<M, D> {
    pub fn new(data: Arc<D>, embedding_model: M) -> Self {
        Self::with_mode(data, embedding_model, ToolMode::Normal)
    }

    pub fn with_mode(data: Arc<D>, embedding_model: M, mode: ToolMode) -> Self {
        Self {
            data,
            embedding_model,
            mode,
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
            description: "Search transaction categories. With a query, semantic search (e.g. 'grocery store purchase' finds Groceries); without a query, returns all categories. Each row: {id, category, category_type, icon}.".to_string(),
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

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let query_vec = match self.mode {
            ToolMode::CodeMode => None,
            ToolMode::Normal => {
                if let Some(ref q) = args.query {
                    Some(
                        embed_query(&self.embedding_model, q)
                            .await
                            .map_err(|e| ToolError(e.to_string()))?,
                    )
                } else {
                    None
                }
            }
        };

        let categories = self
            .data
            .search_categories(query_vec)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        serde_json::to_string(&categories).map_err(Into::into)
    }
}
