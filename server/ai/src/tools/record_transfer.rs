use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::{RecordTransferParams, TransferKind};
use crate::models::tool_output::RecordTransferArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct RecordTransferTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> RecordTransferTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for RecordTransferTool<A> {
    const NAME: &'static str = "record_transfer";

    type Error = ToolError;
    type Args = RecordTransferArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Move money (cash) or an asset between TWO of the user's OWN accounts (e.g. a pension contribution, a mortgage payment from a current account, or moving savings between accounts). Use transfer_kind 'cash' to move a currency amount, or 'asset' to move units of a held asset. This is NOT a buy or sell: to buy or sell an asset use record_asset_trade; to record spending or income use create_transaction. Resolve account_ids via list_accounts and asset_id via search_assets before calling. Call this tool directly when the user describes a transfer — the UI shows an Accept/Reject card for the user to confirm, so do NOT ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "transfer_kind": {
                        "type": "string",
                        "enum": ["cash", "asset"],
                        "description": "'cash' to move a currency amount between accounts, 'asset' to move units of a held asset between accounts."
                    },
                    "from_account_id": {
                        "type": "string",
                        "description": "UUID of the source account the money or asset leaves. Use list_accounts to discover account IDs."
                    },
                    "to_account_id": {
                        "type": "string",
                        "description": "UUID of the destination account the money or asset arrives in. Use list_accounts to discover account IDs."
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "ID of what is moved: for 'cash' this is the currency asset (e.g. GBP); for 'asset' this is the asset being moved. Use search_assets to resolve a ticker/name to an asset_id."
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount to move (positive). For 'cash' it is the currency amount; for 'asset' it is the number of units."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Transfer date/time in ISO 8601 format (e.g. '2026-05-11' or '2026-05-11T14:30:00Z'). Defaults to now."
                    }
                },
                "required": ["transfer_kind", "from_account_id", "to_account_id", "asset_id", "amount"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, asset_id = args.asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let kind = match args.transfer_kind.to_lowercase().as_str() {
            "cash" => TransferKind::Cash,
            "asset" => TransferKind::Asset,
            other => {
                return Err(ToolError(format!(
                    "Invalid transfer_kind '{other}'. Use 'cash' or 'asset'."
                )))
            }
        };

        let from_account_id = args
            .from_account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid from_account_id: {e}")))?;

        let to_account_id = args
            .to_account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid to_account_id: {e}")))?;

        let params = RecordTransferParams {
            kind,
            from_account_id,
            to_account_id,
            asset_id: args.asset_id,
            amount: args.amount,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .record_transfer(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
