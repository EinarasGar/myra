use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::{RecordCashTransferParams, TransferDirection};
use crate::models::tool_output::RecordCashTransferArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct RecordCashTransferTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> RecordCashTransferTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for RecordCashTransferTool<A> {
    const NAME: &'static str = "record_cash_transfer";

    type Error = ToolError;
    type Args = RecordCashTransferArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Record cash crossing the boundary of the user's tracked accounts: money arriving into an account from outside (direction 'in' — e.g. a salary or other income deposit, a gift received, a transfer from an account the user does NOT track in the app, or seeding an account's starting cash balance), or cash leaving an account to the outside world (direction 'out' — e.g. moving cash to an untracked account). This is NOT a move between two of the user's own accounts (use record_transfer for that) and NOT ordinary categorized spending (use create_transaction). Resolve account_id via list_accounts and the currency asset_id via search_assets. Call directly — the UI shows an Accept/Reject card; do not ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "direction": {
                        "type": "string",
                        "enum": ["in", "out"],
                        "description": "'in' for cash arriving into the account from outside, 'out' for cash leaving the account to outside."
                    },
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account the cash arrives in or leaves from. Use list_accounts to discover account IDs."
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "ID of the currency asset (e.g. GBP). Use search_assets to resolve a currency to an asset_id."
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount of cash moved (positive). The direction determines the sign."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Date/time in ISO 8601 format (e.g. '2026-05-11' or '2026-05-11T14:30:00Z'). Defaults to now."
                    }
                },
                "required": ["direction", "account_id", "asset_id", "amount"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, asset_id = args.asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let direction = parse_direction(&args.direction)?;

        let account_id = args
            .account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?;

        let params = RecordCashTransferParams {
            direction,
            account_id,
            asset_id: args.asset_id,
            amount: args.amount,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .record_cash_transfer(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}

fn parse_direction(value: &str) -> Result<TransferDirection, ToolError> {
    match value.to_lowercase().as_str() {
        "in" => Ok(TransferDirection::In),
        "out" => Ok(TransferDirection::Out),
        other => Err(ToolError(format!(
            "Invalid direction '{other}'. Use 'in' or 'out'."
        ))),
    }
}
