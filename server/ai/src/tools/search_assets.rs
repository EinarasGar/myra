use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::embedding::embed_query;
use crate::models::tool_output::SearchAssetsArgs;
use rig::{completion::request::ToolDefinition, embeddings::EmbeddingModel, tool::Tool};
use serde_json::json;

pub struct SearchAssetsTool<M: EmbeddingModel, D: AiDataProvider> {
    data: Arc<D>,
    embedding_model: M,
    mode: ToolMode,
}

impl<M: EmbeddingModel, D: AiDataProvider> SearchAssetsTool<M, D> {
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

impl<M: EmbeddingModel + Send + Sync, D: AiDataProvider> Tool for SearchAssetsTool<M, D> {
    const NAME: &'static str = "search_assets";

    type Error = ToolError;
    type Args = SearchAssetsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Search assets (currencies, stocks, commodities) by keyword or semantically. Use this to find valid asset IDs. Each row: {id, asset_name, ticker, asset_type}.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional keyword or natural language query to find assets (e.g. 'US dollar', 'bitcoin', 'tech stocks')"
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

        let assets = self
            .data
            .search_assets(args.query.as_deref(), query_vec)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        serde_json::to_string(&assets).map_err(Into::into)
    }
}
