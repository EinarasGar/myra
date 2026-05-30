use std::sync::Arc;

use super::ToolError;
use crate::action_provider::AiActionProvider;
use crate::models::action::CreateCustomAssetParams;
use crate::models::tool_output::CreateCustomAssetArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;

pub struct CreateCustomAssetTool<A: AiActionProvider> {
    action: Arc<A>,
}

impl<A: AiActionProvider> CreateCustomAssetTool<A> {
    pub fn new(action: Arc<A>) -> Self {
        Self { action }
    }
}

impl<A: AiActionProvider> Tool for CreateCustomAssetTool<A> {
    const NAME: &'static str = "create_custom_asset";

    type Error = ToolError;
    type Args = CreateCustomAssetArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Create a new user-defined asset (stock, ETF, crypto, real estate, etc.). Use this when the user wants to track a holding that does not yet exist in their asset list. Before calling, use search_assets to confirm the asset is missing and to find the base_pair_id (the currency the asset is denominated in, e.g. USD, EUR). asset_type values: 1=Currencies, 2=Stocks, 3=Bonds, 4=Mutual Funds, 5=ETFs, 6=ETCs, 7=Cryptocurrencies, 8=Real Estate.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Short symbol for the asset (e.g. 'AAPL', 'BTC', 'VWCE'). Must be unique across all assets."
                    },
                    "name": {
                        "type": "string",
                        "description": "Human-readable name (e.g. 'Apple Inc.', 'Bitcoin', 'Vanguard FTSE All-World UCITS ETF')."
                    },
                    "asset_type": {
                        "type": "integer",
                        "description": "Asset type id. 1=Currencies, 2=Stocks, 3=Bonds, 4=Mutual Funds, 5=ETFs, 6=ETCs, 7=Cryptocurrencies, 8=Real Estate."
                    },
                    "base_pair_id": {
                        "type": "integer",
                        "description": "Asset id of the currency the asset is denominated in (use search_assets to look up, e.g. USD or EUR)."
                    }
                },
                "required": ["ticker", "name", "asset_type", "base_pair_id"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let params = CreateCustomAssetParams {
            ticker: args.ticker,
            name: args.name,
            asset_type: args.asset_type,
            base_pair_id: args.base_pair_id,
        };
        let result = self
            .action
            .create_custom_asset(params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        serde_json::to_string(&result).map_err(Into::into)
    }
}
