use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::{RecordAssetTradeParams, RecordAssetTradeSide};
use crate::models::tool_output::RecordAssetTradeArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct RecordAssetTradeTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> RecordAssetTradeTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for RecordAssetTradeTool<A> {
    const NAME: &'static str = "record_asset_trade";

    type Error = ToolError;
    type Args = RecordAssetTradeArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Record an asset purchase or sale (e.g. 'I bought 5 INTC for 200 USD'). Builds a two-entry transaction group: the cash leg (-cost for buy, +proceeds for sell) and the asset leg (+quantity for buy, -quantity for sell), both on the same account, under the Asset Purchase or Asset Sale category. Resolve asset_id via search_assets (or create_custom_asset if it doesn't exist) and account_id via list_accounts before calling this tool. Currency defaults to the user's default currency, and date defaults to now if omitted.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "side": {
                        "type": "string",
                        "enum": ["buy", "sell"],
                        "description": "Trade direction."
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "ID of the asset being traded. Use search_assets to resolve a ticker/name to an asset_id; if no matching asset exists, call create_custom_asset first."
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Number of units traded (positive)."
                    },
                    "total_amount": {
                        "type": "number",
                        "description": "Total cash amount in the chosen currency (positive). For a buy this is what the user paid; for a sell it is what the user received. If the user gave a per-unit price, multiply by quantity."
                    },
                    "currency_asset_id": {
                        "type": "integer",
                        "description": "Optional. ID of the currency asset paid/received. Use search_assets to resolve a currency ticker (e.g. 'USD') to an asset_id. If omitted, the user's default currency is used."
                    },
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account to use. Use list_accounts to discover account IDs."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Trade date/time in ISO 8601 format (e.g. '2026-05-11' or '2026-05-11T14:30:00Z'). Defaults to now."
                    }
                },
                "required": ["side", "asset_id", "quantity", "total_amount", "account_id"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, asset_id = args.asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let side = match args.side.to_lowercase().as_str() {
            "buy" => RecordAssetTradeSide::Buy,
            "sell" => RecordAssetTradeSide::Sell,
            other => {
                return Err(ToolError(format!(
                    "Invalid side '{other}'. Use 'buy' or 'sell'."
                )))
            }
        };

        let account_id = args
            .account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?;

        let params = RecordAssetTradeParams {
            side,
            asset_id: args.asset_id,
            quantity: args.quantity,
            total_amount: args.total_amount,
            currency_asset_id: args.currency_asset_id,
            account_id,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .record_asset_trade(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
