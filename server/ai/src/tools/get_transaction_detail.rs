use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::models::tool_output::GetTransactionDetailArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct GetTransactionDetailTool<D: AiDataProvider> {
    data: Arc<D>,
}

impl<D: AiDataProvider> GetTransactionDetailTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self { data }
    }

    pub fn with_mode(data: Arc<D>, _mode: ToolMode) -> Self {
        Self { data }
    }
}

impl<D: AiDataProvider> Tool for GetTransactionDetailTool<D> {
    const NAME: &'static str = "get_transaction_detail";

    type Error = ToolError;
    type Args = GetTransactionDetailArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Get the full detail of a single transaction: its type, date, description, and every entry/leg and fee entry with the associated accounts, assets, and categories. Requires a transaction_id obtained from a prior query_transactions result row.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "transaction_id": {
                        "type": "string",
                        "description": "UUID of the transaction to inspect, taken from a query_transactions row."
                    }
                },
                "required": ["transaction_id"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let transaction_id = args
            .transaction_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid transaction_id: {e}")))?;

        let result = self
            .data
            .get_transaction_detail(transaction_id)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        serde_json::to_string(&result).map_err(Into::into)
    }
}
