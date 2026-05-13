use std::collections::HashMap;
use std::sync::Arc;

use super::ToolError;
use crate::data_provider::AiDataProvider;
use crate::embedding::embed_query;
use crate::models::search::{SearchParams, TransactionSearchResult};
use crate::models::tool_output::{SearchResult, SearchTransactionsArgs, TransactionResult};
use rig::{completion::request::ToolDefinition, embeddings::EmbeddingModel, tool::Tool};
use rust_decimal::Decimal;
use serde_json::json;
use uuid::Uuid;

pub struct SearchTransactionsTool<M: EmbeddingModel, D: AiDataProvider> {
    data: Arc<D>,
    embedding_model: M,
}

impl<M: EmbeddingModel, D: AiDataProvider> SearchTransactionsTool<M, D> {
    pub fn new(data: Arc<D>, embedding_model: M) -> Self {
        Self {
            data,
            embedding_model,
        }
    }
}

impl<M: EmbeddingModel + Send + Sync, D: AiDataProvider> Tool for SearchTransactionsTool<M, D> {
    const NAME: &'static str = "search_transactions";

    type Error = ToolError;
    type Args = SearchTransactionsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Search transactions by description keyword or phrase. Returns matching transactions with their amounts, dates, and accounts. Use this to find specific transactions like 'bakery', 'tesco', 'rent', etc.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Keyword or phrase to search for in transaction descriptions"
                    },
                    "date_from": {
                        "type": "string",
                        "description": "Optional start date filter in ISO 8601 format (e.g. '2026-01-01')"
                    },
                    "date_to": {
                        "type": "string",
                        "description": "Optional end date filter in ISO 8601 format (e.g. '2026-12-31')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 500)"
                    }
                },
                "required": ["query"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let limit = args.limit.unwrap_or(500);
        let params = SearchParams {
            query: args.query.clone(),
            date_from: args.date_from.clone(),
            date_to: args.date_to.clone(),
            limit,
        };

        let query_vec = embed_query(&self.embedding_model, &args.query)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        let (ilike_results, vector_results, total_count) = tokio::join!(
            self.data.search_transactions_by_text(&params),
            self.data.search_transactions_by_vector(
                query_vec,
                args.date_from.as_deref(),
                args.date_to.as_deref(),
                limit,
            ),
            self.data.count_transactions_by_text(&params),
        );

        let total_count = total_count.unwrap_or(0);

        let mut seen: HashMap<Uuid, TransactionSearchResult> = HashMap::new();

        if let Ok(rows) = ilike_results {
            for row in rows {
                seen.entry(row.transaction_id).or_insert(row);
            }
        }

        if let Ok(rows) = vector_results {
            for row in rows {
                seen.entry(row.transaction_id).or_insert(row);
            }
        }

        let mut transactions: Vec<TransactionSearchResult> = seen.into_values().collect();
        transactions.sort_by(|a, b| b.date_transacted.cmp(&a.date_transacted));
        transactions.truncate(limit as usize);

        let total_amount: Decimal = transactions.iter().map(|t| t.quantity).sum();

        let format = time::format_description::parse("[year]-[month]-[day]").unwrap();

        let result = SearchResult {
            total_count: total_count as usize,
            total_amount,
            transactions: transactions
                .into_iter()
                .map(|t| TransactionResult {
                    description: t.description,
                    date: t.date_transacted.date().format(&format).unwrap_or_default(),
                    amount: t.quantity,
                    asset: t.asset_name,
                    account: t.account_name,
                })
                .collect(),
        };

        serde_json::to_string(&result).map_err(Into::into)
    }
}
