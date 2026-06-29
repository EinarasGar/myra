use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::UpdateTransactionParams;
use crate::models::tool_output::UpdateTransactionArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct UpdateTransactionTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> UpdateTransactionTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for UpdateTransactionTool<A> {
    const NAME: &'static str = "update_transaction";

    type Error = ToolError;
    type Args = UpdateTransactionArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Edit an existing transaction. The date can be changed for ANY transaction type. Description, amount, and category can ONLY be changed on ordinary income/expense (regular) transactions; for other types (trades, transfers, dividends, fees, etc.) those fields are fixed — to change them, delete the transaction and re-record it with the matching tool. Resolve the transaction_id from a prior query_transactions call, and category_id via search_categories. Call this tool directly when the user asks to edit a transaction — the UI shows an Accept/Reject card for the user to confirm, so do NOT ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "transaction_id": {
                        "type": "string",
                        "description": "UUID of the transaction to edit. Obtain it from a prior query_transactions result."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. New date/time in ISO 8601 format (e.g. '2026-05-11'). Allowed for any transaction type."
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional. New description. Only applies to ordinary income/expense (regular) transactions."
                    },
                    "amount": {
                        "type": "number",
                        "description": "Optional. New amount. Only applies to ordinary income/expense (regular) transactions."
                    },
                    "category_id": {
                        "type": "integer",
                        "description": "Optional. New category ID. Only applies to ordinary income/expense (regular) transactions. Use search_categories to resolve."
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

        let params = UpdateTransactionParams {
            transaction_id,
            date: args.date.filter(|s| !s.is_empty()),
            description: args.description.filter(|s| !s.is_empty()),
            amount: args.amount,
            category_id: args.category_id,
        };

        let result = self
            .action
            .update_transaction(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
