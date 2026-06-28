pub mod aggregate_transactions;
pub mod create_custom_asset;
pub mod create_transaction;
pub mod create_transaction_group;
pub mod list_accounts;
pub mod record_asset_trade;
pub mod run_script;
pub mod search_assets;
pub mod search_categories;
pub mod search_transactions;

use std::fmt;

/// How a read tool serves its result. `Normal` is the conversational path the
/// agent uses (semantic search, capped, formatted for reading). `CodeMode` is
/// the bulk path `run_script` uses (plain filter, uncapped, compute-shaped
/// arrays). The mode is fixed at construction — the agent cannot select it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolMode {
    Normal,
    CodeMode,
}

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
