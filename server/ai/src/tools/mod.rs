pub mod aggregate_transactions;
pub mod create_custom_asset;
pub mod create_transaction;
pub mod create_transaction_group;
pub mod list_accounts;
pub mod record_asset_trade;
pub mod search_assets;
pub mod search_categories;
pub mod search_transactions;

use std::fmt;

#[derive(Debug)]
pub struct ToolError(pub String);

impl fmt::Display for ToolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for ToolError {}

macro_rules! impl_tool_error_from {
    ($($t:ty),*) => {
        $(impl From<$t> for ToolError {
            fn from(e: $t) -> Self { ToolError(e.to_string()) }
        })*
    };
}

impl_tool_error_from!(anyhow::Error, serde_json::Error);
