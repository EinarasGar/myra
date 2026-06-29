use std::sync::Arc;

use super::{ToolError, ToolMode};
use crate::data_provider::AiDataProvider;
use crate::embedding::embed_query;
use crate::models::tool_output::QueryTransactionsArgs;
use crate::models::transactions::QueryTransactionsParams;
use rig::{completion::request::ToolDefinition, embeddings::EmbeddingModel, tool::Tool};
use serde_json::json;
use uuid::Uuid;

const NORMAL_LIMIT: i64 = 50;
const NORMAL_MAX: i64 = 200;
const CODE_MODE_SEMANTIC_LIMIT: i64 = 1000;
const CODE_MODE_BROWSE_LIMIT: i64 = 50_000;
const CODE_MODE_MAX: i64 = 50_000;

pub struct QueryTransactionsTool<M: EmbeddingModel, D: AiDataProvider> {
    data: Arc<D>,
    embedding_model: M,
    mode: ToolMode,
}

impl<M: EmbeddingModel, D: AiDataProvider> QueryTransactionsTool<M, D> {
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

impl<M: EmbeddingModel + Send + Sync, D: AiDataProvider> Tool for QueryTransactionsTool<M, D> {
    const NAME: &'static str = "query_transactions";

    type Error = ToolError;
    type Args = QueryTransactionsArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        match self.mode {
            ToolMode::Normal => ToolDefinition {
                name: Self::NAME.to_string(),
                description: "Find and browse the user's transactions. Provide `query` to search by meaning OR merchant/keyword (e.g. 'eating out', 'tesco', 'that dentist charge'); omit it to browse most-recent-first. Optionally filter by account_id, transaction_types (names like 'regular','asset_purchase','cash_dividend','asset_balance_transfer'), and date_from/date_to. Each row gives the amount together with its unit (currency code or asset ticker — never a bare number) and a transaction_id. At most 50 rows are returned; when more match (has_more=true) the result carries a note — use run_script with a query_transactions dataset to total, deduplicate, or otherwise analyze the full set instead of paging. For grouped totals (e.g. spending by category) use aggregate_transactions; to expand one row's full legs and fees use get_transaction_detail with its transaction_id.".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Optional keyword or natural-language phrase to search descriptions by text and meaning. Omit to browse chronologically. Note: meaning-search only matches transactions that have a description (ordinary income/expense and groups)."},
                        "account_id": {"type": "string", "description": "Optional account UUID to restrict to (from list_accounts)."},
                        "transaction_types": {"type": "array", "items": {"type": "string"}, "description": "Optional list of transaction-type names to include: regular, asset_purchase, asset_sale, cash_dividend, asset_dividend, account_fees, cash_transfer_in, cash_transfer_out, asset_transfer_in, asset_transfer_out, asset_trade, asset_balance_transfer, cash_balance_transfer."},
                        "date_from": {"type": "string", "description": "Optional start date (YYYY-MM-DD or RFC3339)."},
                        "date_to": {"type": "string", "description": "Optional end date (YYYY-MM-DD or RFC3339); inclusive."},
                        "limit": {"type": "integer", "description": "Max rows to return (default 50)."},
                        "cursor": {"type": "string", "description": "Pass next_cursor from a previous browse call to fetch the next page (browse only, i.e. when no query)."}
                    },
                    "required": []
                }),
            },
            ToolMode::CodeMode => ToolDefinition {
                name: Self::NAME.to_string(),
                description: "The user's transactions matching optional filters, as a flat array. args {query?, account_id?, transaction_types?, date_from?, date_to?, limit?} — omit query to load the full set in the range (most-recent-first); pass query to load the most relevant matches. If more rows match than can be returned, the call errors asking you to narrow the range/filters, so scope with date_from/date_to. Each row: {transaction_id, date, transaction_type, description, amount (number, negative = spending/outflow), unit (currency code or asset ticker), account}.".to_string(),
                parameters: json!({
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "account_id": {"type": "string"},
                        "transaction_types": {"type": "array", "items": {"type": "string"}},
                        "date_from": {"type": "string"},
                        "date_to": {"type": "string"},
                        "limit": {"type": "integer"}
                    }
                }),
            },
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let account_id = match &args.account_id {
            Some(s) => Some(
                s.parse::<Uuid>()
                    .map_err(|e| ToolError(format!("Invalid account_id: {e}")))?,
            ),
            None => None,
        };
        let cursor = match &args.cursor {
            Some(s) => Some(
                s.parse::<Uuid>()
                    .map_err(|e| ToolError(format!("Invalid cursor: {e}")))?,
            ),
            None => None,
        };

        let query = args.query.filter(|q| !q.trim().is_empty());
        let query_vector = match &query {
            Some(q) => Some(
                embed_query(&self.embedding_model, q)
                    .await
                    .map_err(|e| ToolError(e.to_string()))?,
            ),
            None => None,
        };

        let limit = match self.mode {
            ToolMode::Normal => args.limit.unwrap_or(NORMAL_LIMIT).clamp(1, NORMAL_MAX),
            ToolMode::CodeMode => {
                let default = if query.is_some() {
                    CODE_MODE_SEMANTIC_LIMIT
                } else {
                    CODE_MODE_BROWSE_LIMIT
                };
                args.limit.unwrap_or(default).clamp(1, CODE_MODE_MAX)
            }
        };

        let params = QueryTransactionsParams {
            query,
            account_id,
            transaction_types: args.transaction_types,
            date_from: args.date_from,
            date_to: args.date_to,
            limit,
            cursor,
        };

        let mut result = self
            .data
            .query_transactions(params, query_vector)
            .await
            .map_err(|e| ToolError(e.to_string()))?;

        match self.mode {
            ToolMode::CodeMode => {
                if result.has_more {
                    return Err(ToolError(format!(
                        "query_transactions matched more rows than the {limit}-row dataset limit; narrow date_from/date_to or add filters so the full set fits, then retry."
                    )));
                }
                serde_json::to_string(&result.transactions).map_err(Into::into)
            }
            ToolMode::Normal => {
                if result.has_more {
                    result.note = Some("This is a partial list; more transactions match these filters. To total, deduplicate, or otherwise analyze ALL matching transactions, call run_script with a dataset {\"name\": \"txns\", \"tool\": \"query_transactions\", \"args\": { ...the same query and filters... }} rather than paging through this list.".to_string());
                }
                serde_json::to_string(&result).map_err(Into::into)
            }
        }
    }
}
