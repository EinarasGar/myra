use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::GroupTransactionsParams;
use crate::models::tool_output::GroupTransactionsArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct GroupTransactionsTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> GroupTransactionsTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for GroupTransactionsTool<A> {
    const NAME: &'static str = "group_transactions";

    type Error = ToolError;
    type Args = GroupTransactionsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Bundle two or more EXISTING transactions into a single group under a shared description and category. Grouping is organizational only — it moves no money and changes no balances, so it does NOT require approval and runs immediately. Use it after creating several related transactions (pass their transaction_ids from the create results), or to group transactions the user points to (find their ids with query_transactions first).".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "transaction_ids": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "UUIDs of the existing transactions to group together (at least two)."
                    },
                    "description": {
                        "type": "string",
                        "description": "Shared description/label for the group."
                    },
                    "category_id": {
                        "type": "integer",
                        "description": "Category ID for the group. Reuse a category you already resolved; no need to search again."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional group date in ISO 8601. If omitted, the latest member transaction's date is used."
                    }
                },
                "required": ["transaction_ids", "description", "category_id"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, category_id = args.category_id, count = args.transaction_ids.len()))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let transaction_ids: Result<Vec<Uuid>, ToolError> = args
            .transaction_ids
            .into_iter()
            .map(|id| id.parse::<Uuid>().map_err(|e| ToolError(e.to_string())))
            .collect();
        let params = GroupTransactionsParams {
            transaction_ids: transaction_ids?,
            description: args.description,
            category_id: args.category_id,
            date: args.date,
        };
        let result = self
            .action
            .group_transactions(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
