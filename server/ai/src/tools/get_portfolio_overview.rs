use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::models::tool_output::GetPortfolioOverviewArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

pub struct GetPortfolioOverviewTool<D: AiDataProvider> {
    data: Arc<D>,
}

impl<D: AiDataProvider> GetPortfolioOverviewTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self { data }
    }

    pub fn with_mode(data: Arc<D>, _mode: ToolMode) -> Self {
        Self { data }
    }
}

impl<D: AiDataProvider> Tool for GetPortfolioOverviewTool<D> {
    const NAME: &'static str = "get_portfolio_overview";

    type Error = ToolError;
    type Args = GetPortfolioOverviewArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Investment performance: cost basis, realized/unrealized/total gains, fees, dividends, and market value per asset, plus per-currency cash. Scope to the whole portfolio, one account, or one asset. Set include_positions=true to also return the FIFO purchase lots behind each asset (default false). Note: gains, dividends, and fees are lifetime-from-inception, not year-to-date. The reference currency is resolved server-side from the user's default; pass reference_asset_id only to override it. For units and balances without gains use get_holdings.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "account_id": {
                        "type": "string",
                        "description": "Optional. UUID of an account to scope the overview to. Use list_accounts to discover account IDs. If omitted, covers all accounts."
                    },
                    "asset_id": {
                        "type": "integer",
                        "description": "Optional. ID of a single asset to scope the overview to. Use search_assets to resolve a ticker/name to an asset_id."
                    },
                    "include_positions": {
                        "type": "boolean",
                        "description": "Optional. When true, include the FIFO purchase lots behind each asset. Defaults to false."
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
            .get_portfolio_overview(
                account_id,
                args.asset_id,
                args.include_positions.unwrap_or(false),
                args.reference_asset_id,
            )
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        serde_json::to_string(&result).map_err(Into::into)
    }
}
