use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::CreateTransactionParams;
use crate::models::tool_output::CreateTransactionArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct CreateTransactionTool<A: AiActionProvider> {
    action: Arc<A>,
    user_id: Uuid,
}

impl<A: AiActionProvider> CreateTransactionTool<A> {
    pub fn new(action: Arc<A>, user_id: Uuid) -> Self {
        Self { action, user_id }
    }
}

impl<A: AiActionProvider> Tool for CreateTransactionTool<A> {
    const NAME: &'static str = "create_transaction";

    type Error = ToolError;
    type Args = CreateTransactionArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Create a new individual regular transaction for the user. Use this when the user asks to add, record, or create a transaction. Requires knowing the account_id (use list_accounts first), category_id, asset_id, date, description, and amount. Negative amount means expense/debit, positive means income/credit.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "Transaction date in ISO 8601 format (e.g. '2026-01-15')"
                    },
                    "description": {
                        "type": "string",
                        "description": "Transaction description"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Transaction amount. Negative for expenses/debits, positive for income/credits."
                    },
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account for this transaction (use list_accounts to discover account IDs)"
                    },
                    "category_id": {
                        "type": "integer",
                        "description": "Category ID for the transaction"
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "Asset ID for the transaction entry (use 1 for cash/currency)"
                    }
                },
                "required": ["date", "description", "amount", "account_id", "category_id", "asset_id"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let account_id = args
            .account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(e.to_string()))?;
        let params = CreateTransactionParams {
            date: args.date,
            description: args.description,
            amount: args.amount,
            account_id,
            category_id: args.category_id,
            asset_id: args.asset_id,
        };
        let result = self
            .action
            .create_transaction(self.user_id, params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
