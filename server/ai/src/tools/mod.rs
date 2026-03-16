pub mod account_tools;
pub mod transaction_tools;

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
