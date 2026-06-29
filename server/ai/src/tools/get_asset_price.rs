use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::models::tool_output::GetAssetPriceArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;

pub struct GetAssetPriceTool<D: AiDataProvider> {
    data: Arc<D>,
}

impl<D: AiDataProvider> GetAssetPriceTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self { data }
    }

    pub fn with_mode(data: Arc<D>, _mode: ToolMode) -> Self {
        Self { data }
    }
}

impl<D: AiDataProvider> Tool for GetAssetPriceTool<D> {
    const NAME: &'static str = "get_asset_price";

    type Error = ToolError;
    type Args = GetAssetPriceArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Price of an asset (stock, ETF, crypto, custom asset) or an FX rate between two currencies, quoted in a currency. With no range/dates returns the LATEST price (price + as_of). Pass a range OR date_from/date_to to get a historical series instead (points). The quote currency is resolved server-side from the user's default; pass quote_asset_id only to override. Resolve asset_id (and optional quote_asset_id) via search_assets first.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "asset_id": {
                        "type": "integer",
                        "description": "ID of the asset to price. Use search_assets to resolve a ticker/name to an asset_id."
                    },
                    "quote_asset_id": {
                        "type": "integer",
                        "description": "Optional override for the quote currency. Defaults to the user's default currency, resolved server-side."
                    },
                    "range": {
                        "type": "string",
                        "enum": ["1d", "1w", "1m", "3m", "6m", "1y", "5y", "all"],
                        "description": "Optional. Return a historical price series over this preset window instead of the latest price."
                    },
                    "date_from": {
                        "type": "string",
                        "description": "Optional custom series start (YYYY-MM-DD). Alternative to range."
                    },
                    "date_to": {
                        "type": "string",
                        "description": "Optional custom series end (YYYY-MM-DD); inclusive."
                    }
                },
                "required": ["asset_id"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, asset_id = args.asset_id))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let result = self
            .data
            .get_asset_price(
                args.asset_id,
                args.quote_asset_id,
                args.range,
                args.date_from,
                args.date_to,
            )
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        serde_json::to_string(&result).map_err(Into::into)
    }
}
