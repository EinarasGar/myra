use std::sync::Arc;

use super::ToolError;
use crate::data_provider::AiDataProvider;
use crate::models::tool_output::ListAccountsArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;

pub struct ListAccountsTool<D: AiDataProvider> {
    data: Arc<D>,
}

impl<D: AiDataProvider> ListAccountsTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self { data }
    }
}

impl<D: AiDataProvider> Tool for ListAccountsTool<D> {
    const NAME: &'static str = "list_accounts";

    type Error = ToolError;
    type Args = ListAccountsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "List all active accounts for the user. Returns account names, types, and liquidity types.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
        }
    }

    async fn call(&self, _args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let accounts = self
            .data
            .list_accounts()
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        serde_json::to_string(&accounts).map_err(Into::into)
    }
}
