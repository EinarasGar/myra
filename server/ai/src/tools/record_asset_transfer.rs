use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::{RecordAssetTransferParams, TransferDirection};
use crate::models::tool_output::RecordAssetTransferArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct RecordAssetTransferTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> RecordAssetTransferTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for RecordAssetTransferTool<A> {
    const NAME: &'static str = "record_asset_transfer";

    type Error = ToolError;
    type Args = RecordAssetTransferArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Record units of an asset crossing the boundary of the user's tracked accounts: an asset received from outside (direction 'in' — e.g. crypto a friend sends as a gift, or seeding existing holdings the user already owned), or an asset sent out of an account to the outside world (direction 'out' — e.g. gifting shares away). An 'in' transfer sets the position's cost basis at the asset's market value on the transfer date. This is NOT a buy/sell against cash (use record_asset_trade), NOT a swap of one asset for another (use record_asset_swap), and NOT a move between the user's own accounts (use record_transfer). Resolve account_id via list_accounts and asset_id via search_assets. Call directly — the UI shows an Accept/Reject card; do not ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "direction": {
                        "type": "string",
                        "enum": ["in", "out"],
                        "description": "'in' for an asset received into the account from outside, 'out' for an asset leaving the account to outside."
                    },
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account the asset arrives in or leaves from. Use list_accounts to discover account IDs."
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "ID of the asset being moved. Use search_assets to resolve a ticker/name to an asset_id."
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Number of units moved (positive). The direction determines the sign."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Date/time in ISO 8601 format (e.g. '2026-05-11' or '2026-05-11T14:30:00Z'). Defaults to now."
                    }
                },
                "required": ["direction", "account_id", "asset_id", "quantity"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, asset_id = args.asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let direction = match args.direction.to_lowercase().as_str() {
            "in" => TransferDirection::In,
            "out" => TransferDirection::Out,
            other => {
                return Err(ToolError(format!(
                    "Invalid direction '{other}'. Use 'in' or 'out'."
                )))
            }
        };

        let account_id = args
            .account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?;

        let params = RecordAssetTransferParams {
            direction,
            account_id,
            asset_id: args.asset_id,
            quantity: args.quantity,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .record_asset_transfer(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
