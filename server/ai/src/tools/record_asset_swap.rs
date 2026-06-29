use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::RecordAssetSwapParams;
use crate::models::tool_output::RecordAssetSwapArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct RecordAssetSwapTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> RecordAssetSwapTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for RecordAssetSwapTool<A> {
    const NAME: &'static str = "record_asset_swap";

    type Error = ToolError;
    type Args = RecordAssetSwapArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Record a direct exchange of one asset for another within a single account, with no cash leg (e.g. swapping BTC for ETH on an exchange, or converting one token to another). The user gives up from_quantity of from_asset and receives to_quantity of to_asset. For buying or selling an asset against cash use record_asset_trade instead. Resolve account_id via list_accounts and both asset_ids via search_assets. Call directly — the UI shows an Accept/Reject card; do not ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account where the swap happens. Use list_accounts to discover account IDs."
                    },
                    "from_asset_id": {
                        "type": "integer",
                        "description": "ID of the asset given up. Use search_assets to resolve a ticker/name to an asset_id."
                    },
                    "from_quantity": {
                        "type": "number",
                        "description": "Number of units of from_asset given up (positive)."
                    },
                    "to_asset_id": {
                        "type": "integer",
                        "description": "ID of the asset received. Use search_assets to resolve a ticker/name to an asset_id."
                    },
                    "to_quantity": {
                        "type": "number",
                        "description": "Number of units of to_asset received (positive)."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Date/time in ISO 8601 format (e.g. '2026-05-11' or '2026-05-11T14:30:00Z'). Defaults to now."
                    }
                },
                "required": ["account_id", "from_asset_id", "from_quantity", "to_asset_id", "to_quantity"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, from_asset_id = args.from_asset_id, to_asset_id = args.to_asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let account_id = args
            .account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?;

        let params = RecordAssetSwapParams {
            account_id,
            from_asset_id: args.from_asset_id,
            from_quantity: args.from_quantity,
            to_asset_id: args.to_asset_id,
            to_quantity: args.to_quantity,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .record_asset_swap(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
