use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::models::tool_output::GetHoldingsArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct GetHoldingsTool<D: AiDataProvider> {
    data: Arc<D>,
    mode: ToolMode,
}

impl<D: AiDataProvider> GetHoldingsTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self::with_mode(data, ToolMode::Normal)
    }

    pub fn with_mode(data: Arc<D>, mode: ToolMode) -> Self {
        Self { data, mode }
    }
}

impl<D: AiDataProvider> Tool for GetHoldingsTool<D> {
    const NAME: &'static str = "get_holdings";

    type Error = ToolError;
    type Args = GetHoldingsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let description = match self.mode {
            ToolMode::Normal => "Current holdings AND net worth. Returns total_value (= net worth, debts netted, ownership-share applied) plus, per asset and account, units and value with asset type and denominating currency. Use for 'what's my net worth' (read total_value, ideally with summary=true), 'what do I hold', allocation/exposure, cash balances, and liability balances. Optionally scope to one account or one asset. Passing group_by (asset, account, asset_type, or currency) returns allocation buckets with per-bucket value and share. Holdings with no price path are listed in unvalued_assets and excluded from total_value. Reference currency is resolved server-side from the user's default; pass reference_asset_id only to override. For gains and cost basis use get_portfolio_overview.",
            ToolMode::CodeMode => "The user's current holdings as a flat array, one row per asset+account, valued in the reference currency (the user's default unless reference_asset_id is given). args {account_id?, asset_id?, reference_asset_id?}. Each row: {asset_id, asset_name, ticker, asset_type, denominating_currency, account_id, account_name, units (number), value (number or null — null = no price path)}.",
        };
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: description.to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "account_id": {
                        "type": "string",
                        "description": "Optional. UUID of an account to scope holdings to. Use list_accounts to discover account IDs. If omitted, covers all accounts."
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "Optional. ID of a single asset to scope holdings to. Use search_assets to resolve a ticker/name to an asset_id."
                    },
                    "group_by": {
                        "type": "string",
                        "enum": ["asset", "account", "asset_type", "currency"],
                        "description": "Optional. Return allocation buckets grouped by this dimension, each with its value and share of the total."
                    },
                    "summary": {
                        "type": "boolean",
                        "description": "Optional. When true, omit the per-asset row list and return only total_value (+ any group_by buckets). Use for plain net-worth questions to keep the answer compact."
                    },
                    "reference_asset_id": {
                        "type": "integer",
                        "description": "Optional override for the reference currency. Defaults to the user's default currency, resolved server-side. Use search_assets to resolve a currency ticker to an asset_id."
                    }
                },
                "required": []
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let account_id = match args.account_id {
            Some(s) => Some(
                s.parse::<Uuid>()
                    .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?,
            ),
            None => None,
        };

        let result = self
            .data
            .get_holdings(
                account_id,
                args.asset_id,
                args.group_by,
                args.summary.unwrap_or(false),
                args.reference_asset_id,
            )
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        match self.mode {
            ToolMode::CodeMode => serde_json::to_string(&result.holdings).map_err(Into::into),
            ToolMode::Normal => serde_json::to_string(&result).map_err(Into::into),
        }
    }
}
