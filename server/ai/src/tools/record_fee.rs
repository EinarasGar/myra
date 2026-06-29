use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::RecordFeeParams;
use crate::models::tool_output::RecordFeeArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct RecordFeeTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> RecordFeeTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for RecordFeeTool<A> {
    const NAME: &'static str = "record_fee";

    type Error = ToolError;
    type Args = RecordFeeArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Record an account-level fee or charge (e.g. custody fee, platform fee, account maintenance charge) that is deducted from the account's cash. Provide the amount as a positive number; it is recorded as a deduction from cash. Resolve account_id via list_accounts and the currency asset_id via search_assets before calling. Call this tool directly when the user describes a fee — the UI shows an Accept/Reject card for the user to confirm, so do NOT ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account the fee is charged to. Use list_accounts to discover account IDs."
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "ID of the currency the fee is charged in. Use search_assets to resolve a currency ticker (e.g. 'GBP')."
                    },
                    "amount": {
                        "type": "number",
                        "description": "The fee amount (positive). It is recorded as a deduction from the account's cash."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Fee date/time in ISO 8601 format (e.g. '2026-05-11'). Defaults to now."
                    }
                },
                "required": ["account_id", "asset_id", "amount"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, asset_id = args.asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let account_id = args
            .account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?;

        let params = RecordFeeParams {
            account_id,
            asset_id: args.asset_id,
            amount: args.amount,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .record_fee(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
