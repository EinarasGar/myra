use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::models::tool_output::GetNetWorthHistoryArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct GetNetWorthHistoryTool<D: AiDataProvider> {
    data: Arc<D>,
    mode: ToolMode,
}

impl<D: AiDataProvider> GetNetWorthHistoryTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self::with_mode(data, ToolMode::Normal)
    }

    pub fn with_mode(data: Arc<D>, mode: ToolMode) -> Self {
        Self { data, mode }
    }
}

impl<D: AiDataProvider> Tool for GetNetWorthHistoryTool<D> {
    const NAME: &'static str = "get_net_worth_history";

    type Error = ToolError;
    type Args = GetNetWorthHistoryArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let description = match self.mode {
            ToolMode::Normal => "Net-worth trend over a preset range. Returns dated points plus the start value, end value, and change over the period. Optionally scope to one account. The reference currency is resolved server-side from the user's default; pass reference_asset_id only to override it. For the current single net-worth figure use get_net_worth.",
            ToolMode::CodeMode => "The user's net-worth trend as a flat array of dated points, valued in the reference currency (the user's default unless reference_asset_id is given). args {range (1d|1w|1m|3m|6m|1y|5y|all), account_id?, reference_asset_id?}. Each row: {date, value (number)}.",
        };
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: description.to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "range": {
                        "type": "string",
                        "enum": ["1d", "1w", "1m", "3m", "6m", "1y", "5y", "all"],
                        "description": "Time range for the trend."
                    },
                    "account_id": {
                        "type": "string",
                        "description": "Optional. UUID of an account to scope the trend to. Use list_accounts to discover account IDs. If omitted, covers all accounts."
                    },
                    "reference_asset_id": {
                        "type": "integer",
                        "description": "Optional override for the reference currency. Defaults to the user's default currency, resolved server-side. Use search_assets to resolve a currency ticker to an asset_id."
                    }
                },
                "required": ["range"]
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
            .get_net_worth_history(args.range, account_id, args.reference_asset_id)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        match self.mode {
            ToolMode::CodeMode => serde_json::to_string(&result.points).map_err(Into::into),
            ToolMode::Normal => serde_json::to_string(&result).map_err(Into::into),
        }
    }
}
