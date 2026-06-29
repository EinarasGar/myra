use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::DeleteTransactionParams;
use crate::models::tool_output::DeleteTransactionArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct DeleteTransactionTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> DeleteTransactionTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for DeleteTransactionTool<A> {
    const NAME: &'static str = "delete_transaction";

    type Error = ToolError;
    type Args = DeleteTransactionArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Permanently delete a transaction and all of its entries. Obtain the transaction_id from a prior query_transactions result. This is destructive and cannot be undone — the approval card lets the user confirm. Call this tool directly when the user asks to delete a transaction — the UI shows an Accept/Reject card for the user to confirm, so do NOT ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "transaction_id": {
                        "type": "string",
                        "description": "UUID of the transaction to delete. Obtain it from a prior query_transactions result."
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

        let params = DeleteTransactionParams { transaction_id };

        let result = self
            .action
            .delete_transaction(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
