use std::collections::HashMap;
use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::embedding::embed_query;
use crate::models::search::{SearchParams, TransactionSearchResult};
use crate::models::tool_output::{
    InjectedTransaction, SearchResult, SearchTransactionsArgs, TransactionResult,
};
use rig::{completion::request::ToolDefinition, embeddings::EmbeddingModel, tool::Tool};
use rust_decimal::Decimal;
use serde_json::json;
use uuid::Uuid;

const RESPONSE_CAP: usize = 50;
const CODE_MODE_LIMIT: i64 = 1000;

pub struct SearchTransactionsTool<M: EmbeddingModel, D: AiDataProvider> {
    data: Arc<D>,
    embedding_model: M,
    mode: ToolMode,
}

impl<M: EmbeddingModel, D: AiDataProvider> SearchTransactionsTool<M, D> {
    pub fn new(data: Arc<D>, embedding_model: M) -> Self {
        Self::with_mode(data, embedding_model, ToolMode::Normal)
    }

    pub fn with_mode(data: Arc<D>, embedding_model: M, mode: ToolMode) -> Self {
        Self {
            data,
            embedding_model,
            mode,
        }
    }
}

impl<M: EmbeddingModel + Send + Sync, D: AiDataProvider> SearchTransactionsTool<M, D> {
    async fn run_normal(&self, args: SearchTransactionsArgs) -> Result<String, ToolError> {
        let query = args
            .query
            .clone()
            .ok_or_else(|| ToolError("query is required for search_transactions".to_string()))?;

        let limit = args.limit.unwrap_or(500);
        let params = SearchParams {
            query: query.clone(),
            date_from: args.date_from.clone(),
            date_to: args.date_to.clone(),
            limit,
        };

        let query_vec = embed_query(&self.embedding_model, &query)
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

        let matched = transactions.len();
        transactions.truncate(RESPONSE_CAP);
        let returned = transactions.len();

        tracing::Span::current().record("count", returned);

        let total_amount: Decimal = transactions.iter().map(|t| t.quantity).sum();
        let total_count = total_count as usize;

        let note = truncation_note(returned, matched, total_count);

        let format = time::format_description::parse_borrowed::<2>("[year]-[month]-[day]").unwrap();

        let result = SearchResult {
            returned_count: returned,
            total_count,
            total_amount,
            note,
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

    async fn run_code_mode(&self, args: SearchTransactionsArgs) -> Result<String, ToolError> {
        let params = SearchParams {
            query: args.query.unwrap_or_default(),
            date_from: args.date_from,
            date_to: args.date_to,
            limit: args.limit.unwrap_or(CODE_MODE_LIMIT),
        };
        let rows = self
            .data
            .search_transactions_by_text(&params)
            .await
            .map_err(|e| ToolError(e.to_string()))?;
        let injected: Vec<InjectedTransaction> = rows.into_iter().map(Into::into).collect();
        serde_json::to_string(&injected).map_err(Into::into)
    }
}

impl<M: EmbeddingModel + Send + Sync, D: AiDataProvider> Tool for SearchTransactionsTool<M, D> {
    const NAME: &'static str = "search_transactions";

    type Error = ToolError;
    type Args = SearchTransactionsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        match self.mode {
            ToolMode::Normal => ToolDefinition {
                name: Self::NAME.to_string(),
                description: "Search transactions by description keyword or phrase. Returns matching transactions with their amounts, dates, and accounts. Use this to find specific transactions like 'bakery', 'tesco', 'rent', etc. At most 50 transactions are returned; when more match, the response includes total_count and a note — use run_script (with a search_transactions dataset) to total, deduplicate, or analyze the full set rather than this sample.".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "query": { "type": "string", "description": "Keyword or phrase to search for in transaction descriptions" },
                        "date_from": { "type": "string", "description": "Optional start date filter in ISO 8601 format (e.g. '2026-01-01')" },
                        "date_to": { "type": "string", "description": "Optional end date filter in ISO 8601 format (e.g. '2026-12-31')" },
                        "limit": { "type": "integer", "description": "Maximum number of matches to scan (the response itself returns at most 50 transactions regardless)" }
                    },
                    "required": ["query"]
                }),
            },
            ToolMode::CodeMode => ToolDefinition {
                name: Self::NAME.to_string(),
                description: "Transactions matching optional filters. args {query?, date_from?, date_to?, limit?} — omit query to load every transaction in the date range. Each row: {id, description, date, amount (number, negative = spending), asset, account}.".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "query": { "type": "string" },
                        "date_from": { "type": "string" },
                        "date_to": { "type": "string" },
                        "limit": { "type": "integer" }
                    }
                }),
            },
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME, count = tracing::field::Empty))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        match self.mode {
            ToolMode::Normal => self.run_normal(args).await,
            ToolMode::CodeMode => self.run_code_mode(args).await,
        }
    }
}

fn truncation_note(returned: usize, matched: usize, total_count: usize) -> Option<String> {
    (total_count > returned || matched > returned).then(|| {
        format!(
            "Showing {returned} of {total_count} matching transactions; the totals here cover only this sample. To total, deduplicate, or otherwise analyze ALL matching transactions, call run_script with a dataset {{\"name\": \"txns\", \"tool\": \"search_transactions\", \"args\": {{ ...the same query and date filters... }}}} instead of relying on this partial list."
        )
    })
}

#[cfg(test)]
mod tests {
    use super::truncation_note;

    #[test]
    fn no_note_when_everything_fits() {
        assert!(truncation_note(12, 12, 12).is_none());
    }

    #[test]
    fn note_when_total_exceeds_returned() {
        let note = truncation_note(50, 50, 712).expect("note expected");
        assert!(note.contains("Showing 50 of 712"));
        assert!(note.contains("run_script"));
    }

    #[test]
    fn note_when_more_matched_than_returned() {
        assert!(truncation_note(50, 80, 50).is_some());
    }
}
