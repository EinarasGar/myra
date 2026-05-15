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
            description: "Record an asset purchase or sale (e.g. 'I bought 5 INTC for 200 USD'). Builds a two-entry transaction group: the cash leg (-cost for buy, +proceeds for sell) and the asset leg (+quantity for buy, -quantity for sell), both on the same account, under the Asset Purchase or Asset Sale category. The server auto-resolves: account (uses the user's single Investment account if they only have one), currency (defaults to the user's default currency), and date (defaults to today). Required: side ('buy' or 'sell'), ticker, quantity, total_amount. The tool will return a clear error to relay if it needs more info (e.g. multiple investment accounts, asset ticker not found, no investment account).".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "side": {
                        "type": "string",
                        "enum": ["buy", "sell"],
                        "description": "Trade direction."
                    },
                    "ticker": {
                        "type": "string",
                        "description": "Ticker of the asset being traded (e.g. 'INTC', 'BTC'). Must match an existing asset; if it doesn't exist, call create_custom_asset first."
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Number of units traded (positive)."
                    },
                    "total_amount": {
                        "type": "number",
                        "description": "Total cash amount in the chosen currency (positive). For a buy this is what the user paid; for a sell it is what the user received. If the user gave a per-unit price, multiply by quantity."
                    },
                    "currency_ticker": {
                        "type": "string",
                        "description": "Optional. Ticker of the currency paid/received (e.g. 'USD'). If omitted, the user's default currency is used."
                    },
                    "account_id": {
                        "type": "string",
                        "description": "Optional. UUID of the account to use. Usually omit and let the server pick the user's investment account."
                    },
                    "account_name": {
                        "type": "string",
                        "description": "Optional. Name (or substring) of the account if the user named one (e.g. 'Revolut'). Server resolves to an account UUID; omit if the user did not specify an account."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Trade date in ISO 8601 format (e.g. '2026-05-11'). Defaults to today."
                    }
                },
                "required": ["side", "ticker", "quantity", "total_amount"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let side = match args.side.to_lowercase().as_str() {
            "buy" => RecordAssetTradeSide::Buy,
            "sell" => RecordAssetTradeSide::Sell,
            other => return Err(ToolError(format!("Invalid side '{other}'. Use 'buy' or 'sell'."))),
        };

        let account_id = match args.account_id {
            Some(s) if !s.is_empty() => Some(
                s.parse::<Uuid>()
                    .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?,
            ),
            _ => None,
        };

        let params = RecordAssetTradeParams {
            side,
            ticker: args.ticker,
            quantity: args.quantity,
            total_amount: args.total_amount,
            currency_ticker: args.currency_ticker.filter(|s| !s.is_empty()),
            account_id,
            account_name: args.account_name.filter(|s| !s.is_empty()),
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
