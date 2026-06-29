use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::models::aggregate::AggregateParams;
use crate::models::tool_output::AggregateTransactionsArgs;
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;
use uuid::Uuid;

const NORMAL_LIMIT: i64 = 100;
const CODE_MODE_LIMIT: i64 = 5000;

pub struct AggregateTransactionsTool<D: AiDataProvider> {
    data: Arc<D>,
    mode: ToolMode,
}

impl<D: AiDataProvider> AggregateTransactionsTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self::with_mode(data, ToolMode::Normal)
    }

    pub fn with_mode(data: Arc<D>, mode: ToolMode) -> Self {
        Self { data, mode }
    }
}

impl<D: AiDataProvider> Tool for AggregateTransactionsTool<D> {
    const NAME: &'static str = "aggregate_transactions";

    type Error = ToolError;
    type Args = AggregateTransactionsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let description = match self.mode {
            ToolMode::Normal => "Get spending or income totals grouped by a dimension (category, description, account, or month). Use for summary questions like 'how much did I spend by category' or 'monthly spending'. Totals are in ONE currency — the user's default currency unless you pass currency_asset_id — and cover cash movements in that currency only (foreign-currency and asset-unit entries are excluded). The result states which currency it is in. Negative = spending, positive = income.",
            ToolMode::CodeMode => "Spending/income totals grouped by a dimension, in ONE currency (the user's default unless currency_asset_id is given). args {group_by (category|description|account|month), date_from?, date_to?, description_filter?, account_id?, currency_asset_id?}. Each row: {group_name, total_amount (number, negative = spending), transaction_count}.",
        };
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: description.to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "group_by": {
                        "type": "string",
                        "enum": ["category", "description", "account", "month"],
                        "description": "Dimension to group results by"
                    },
                    "date_from": {
                        "type": "string",
                        "description": "Optional start date filter (YYYY-MM-DD or RFC3339)"
                    },
                    "date_to": {
                        "type": "string",
                        "description": "Optional end date filter (YYYY-MM-DD or RFC3339)"
                    },
                    "description_filter": {
                        "type": "string",
                        "description": "Optional keyword filter on transaction descriptions"
                    },
                    "account_id": {
                        "type": "string",
                        "description": "Optional account UUID to restrict the aggregation to (from list_accounts)."
                    },
                    "currency_asset_id": {
                        "type": "integer",
                        "description": "Optional currency to total in (from search_assets). Defaults to the user's default currency, resolved server-side."
                    }
                },
                "required": ["group_by"]
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

        let limit = match self.mode {
            ToolMode::Normal => NORMAL_LIMIT,
            ToolMode::CodeMode => CODE_MODE_LIMIT,
        };

        let params = AggregateParams {
            group_by: args.group_by,
            date_from: args.date_from,
            date_to: args.date_to,
            description_filter: args.description_filter,
            account_id,
            currency_asset_id: args.currency_asset_id,
            limit,
        };

        let mut result = self
            .data
            .aggregate_transactions(&params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        match self.mode {
            ToolMode::CodeMode => {
                if result.has_more {
                    return Err(ToolError(format!(
                        "aggregate_transactions produced more than {limit} groups; narrow date_from/date_to or filters, or use a coarser group_by, so the full set fits, then retry."
                    )));
                }
                serde_json::to_string(&result.groups).map_err(Into::into)
            }
            ToolMode::Normal => {
                if result.has_more {
                    result.note = Some(format!(
                        "Showing the {limit} largest groups; more match. For an exhaustive grouped total call run_script with an aggregate_transactions dataset (narrow the range or use a coarser group_by if it reports an overflow)."
                    ));
                }
                serde_json::to_string(&result).map_err(Into::into)
            }
        }
    }
}
