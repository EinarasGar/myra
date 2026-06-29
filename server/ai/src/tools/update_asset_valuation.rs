use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::UpdateAssetValuationParams;
use crate::models::tool_output::UpdateAssetValuationArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;

pub struct UpdateAssetValuationTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> UpdateAssetValuationTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for UpdateAssetValuationTool<A> {
    const NAME: &'static str = "update_asset_valuation";

    type Error = ToolError;
    type Args = UpdateAssetValuationArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Record a new value for a user-OWNED custom asset (e.g. revalue a house, a car, or a private holding). This is NOT a trade and does not move any cash. Only works for user-owned assets; market-listed assets (stocks, ETFs, crypto) update their prices automatically and cannot be revalued this way. Resolve asset_id via search_assets before calling. Call this tool directly when the user gives a new value — the UI shows an Accept/Reject card for the user to confirm, so do NOT ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "asset_id": {
                        "type": "integer",
                        "description": "ID of the user-owned custom asset to revalue. Use search_assets to resolve a name to an asset_id."
                    },
                    "value": {
                        "type": "number",
                        "description": "The new value of one unit of the asset, expressed in the quote currency."
                    },
                    "currency_asset_id": {
                        "type": "integer",
                        "description": "Optional. ID of the currency the value is expressed in. Use search_assets to resolve a currency ticker (e.g. 'GBP'). Defaults to the asset's denominating currency."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Valuation date/time in ISO 8601 format (e.g. '2026-05-11'). Defaults to now."
                    }
                },
                "required": ["asset_id", "value"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, asset_id = args.asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let params = UpdateAssetValuationParams {
            asset_id: args.asset_id,
            value: args.value,
            currency_asset_id: args.currency_asset_id,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .update_asset_valuation(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
