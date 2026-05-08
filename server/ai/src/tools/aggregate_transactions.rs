use std::sync::Arc;

use super::ToolError;
use crate::data_provider::AiDataProvider;
use crate::models::aggregate::AggregateParams;
use crate::models::tool_output::{AggregateGroup, AggregateResult, AggregateTransactionsArgs};
use rig::{completion::request::ToolDefinition, tool::Tool};
use serde_json::json;

pub struct AggregateTransactionsTool<D: AiDataProvider> {
    data: Arc<D>,
}

impl<D: AiDataProvider> AggregateTransactionsTool<D> {
    pub fn new(data: Arc<D>) -> Self {
        Self { data }
    }
}

impl<D: AiDataProvider> Tool for AggregateTransactionsTool<D> {
    const NAME: &'static str = "aggregate_transactions";

    type Error = ToolError;
    type Args = AggregateTransactionsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Get spending or income totals grouped by a dimension. Use this for summary questions like 'how much did I spend by category' or 'monthly spending breakdown'. Negative amounts are spending, positive amounts are income.".to_string(),
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
                        "description": "Optional start date filter in ISO 8601 format"
                    },
                    "date_to": {
                        "type": "string",
                        "description": "Optional end date filter in ISO 8601 format"
                    },
                    "description_filter": {
                        "type": "string",
                        "description": "Optional keyword filter on transaction descriptions"
                    }
                },
                "required": ["group_by"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let params = AggregateParams {
            group_by: args.group_by,
            date_from: args.date_from,
            date_to: args.date_to,
            description_filter: args.description_filter,
        };

        let groups = self
            .data
            .aggregate_transactions(&params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        let result = AggregateResult {
            groups: groups
                .into_iter()
                .map(|g| AggregateGroup {
                    group_name: g.group_name,
                    total_amount: g.total_amount,
                    transaction_count: g.transaction_count,
                })
                .collect(),
        };

        serde_json::to_string(&result).map_err(Into::into)
    }
}
