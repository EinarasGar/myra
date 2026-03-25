use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::{CreateTransactionGroupParams, TransactionEntryParam};
use crate::models::tool_output::CreateTransactionGroupArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct CreateTransactionGroupTool<A: AiActionProvider> {
    action: Arc<A>,
    user_id: Uuid,
}

impl<A: AiActionProvider> CreateTransactionGroupTool<A> {
    pub fn new(action: Arc<A>, user_id: Uuid) -> Self {
        Self { action, user_id }
    }
}

impl<A: AiActionProvider> Tool for CreateTransactionGroupTool<A> {
    const NAME: &'static str = "create_transaction_group";

    type Error = ToolError;
    type Args = CreateTransactionGroupArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Create a transaction group containing multiple related transactions under a single description and category. Use when the user wants to record a split transaction or a group of related transactions at once.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "Group date in ISO 8601 format (e.g. '2026-01-15')"
                    },
                    "description": {
                        "type": "string",
                        "description": "Group description"
                    },
                    "category_id": {
                        "type": "integer",
                        "description": "Category ID for the transaction group"
                    },
                    "entries": {
                        "type": "array",
                        "description": "List of transaction entries in the group",
                        "items": {
                            "type": "object",
                            "properties": {
                                "amount": {
                                    "type": "number",
                                    "description": "Entry amount. Negative for expenses/debits."
                                },
                                "account_id": {
                                    "type": "string",
                                    "description": "UUID of the account for this entry"
                                },
                                "asset_id": {
                                    "type": "integer",
                                    "description": "Asset ID for this entry (use 1 for cash/currency)"
                                },
                                "description": {
                                    "type": "string",
                                    "description": "Optional description for this specific entry (e.g. individual item name from a receipt)"
                                },
                                "category_id": {
                                    "type": "integer",
                                    "description": "Optional category ID for this entry. If omitted, uses the group's category_id."
                                }
                            },
                            "required": ["amount", "account_id", "asset_id"]
                        }
                    }
                },
                "required": ["date", "description", "category_id", "entries"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let entries: Result<Vec<TransactionEntryParam>, ToolError> = args
            .entries
            .into_iter()
            .map(|e| {
                let account_id = e
                    .account_id
                    .parse::<Uuid>()
                    .map_err(|e| ToolError(e.to_string()))?;
                Ok(TransactionEntryParam {
                    amount: e.amount,
                    account_id,
                    asset_id: e.asset_id,
                    description: e.description,
                    category_id: e.category_id,
                })
            })
            .collect();
        let params = CreateTransactionGroupParams {
            date: args.date,
            description: args.description,
            category_id: args.category_id,
            entries: entries?,
        };
        let result = self
            .action
            .create_transaction_group(self.user_id, params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
