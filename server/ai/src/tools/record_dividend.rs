use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::{DividendKind, RecordDividendParams};
use crate::models::tool_output::RecordDividendArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct RecordDividendTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> RecordDividendTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for RecordDividendTool<A> {
    const NAME: &'static str = "record_dividend";

    type Error = ToolError;
    type Args = RecordDividendArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Record a dividend paid out by a holding. With dividend_kind 'cash', a holding pays cash: set paying_asset_id to the stock/ETF that paid, amount to the cash received, currency_asset_id to the cash currency (defaults to the user's currency), and optionally withholding_amount for tax withheld. With dividend_kind 'asset', the dividend is paid as extra units of an asset: set paying_asset_id to the asset received and amount to the number of units. Resolve asset_ids via search_assets and account_id via list_accounts before calling. Call this tool directly when the user describes a dividend — the UI shows an Accept/Reject card for the user to confirm, so do NOT ask for confirmation in chat.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "dividend_kind": {
                        "type": "string",
                        "enum": ["cash", "asset"],
                        "description": "'cash' for a cash dividend, 'asset' for a dividend paid as additional units of an asset."
                    },
                    "paying_asset_id": {
                        "type": "integer",
                        "description": "For 'cash': the stock/ETF that paid the dividend. For 'asset': the asset received as the dividend. Use search_assets to resolve."
                    },
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account that holds the position and receives the dividend. Use list_accounts to discover account IDs."
                    },
                    "amount": {
                        "type": "number",
                        "description": "For 'cash': the cash amount received. For 'asset': the number of units received."
                    },
                    "currency_asset_id": {
                        "type": "integer",
                        "description": "Optional. For 'cash' dividends, the currency of the cash received. Use search_assets to resolve a currency ticker. Defaults to the user's default currency."
                    },
                    "withholding_amount": {
                        "type": "number",
                        "description": "Optional. For 'cash' dividends, the amount of tax withheld at source, in the same currency."
                    },
                    "date": {
                        "type": "string",
                        "description": "Optional. Dividend date/time in ISO 8601 format (e.g. '2026-05-11'). Defaults to now."
                    }
                },
                "required": ["dividend_kind", "paying_asset_id", "account_id", "amount"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, paying_asset_id = args.paying_asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let kind = match args.dividend_kind.to_lowercase().as_str() {
            "cash" => DividendKind::Cash,
            "asset" => DividendKind::Asset,
            other => {
                return Err(ToolError(format!(
                    "Invalid dividend_kind '{other}'. Use 'cash' or 'asset'."
                )))
            }
        };

        let account_id = args
            .account_id
            .parse::<Uuid>()
            .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?;

        let params = RecordDividendParams {
            kind,
            paying_asset_id: args.paying_asset_id,
            account_id,
            amount: args.amount,
            currency_asset_id: args.currency_asset_id,
            withholding_amount: args.withholding_amount,
            date: args.date.filter(|s| !s.is_empty()),
        };

        let result = self
            .action
            .record_dividend(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
