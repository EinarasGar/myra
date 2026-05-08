use std::sync::Arc;

use rig::agent::Agent;
use rig::client::{CompletionClient, EmbeddingsClient};
use rig::providers::gemini;

use crate::action_provider::AiActionProvider;
use crate::config::AiConfig;
use crate::data_provider::AiDataProvider;
use crate::embedding::EMBEDDING_DIMS;
use crate::provider::create_gemini_client;
use crate::tools::aggregate_transactions::AggregateTransactionsTool;
use crate::tools::create_transaction::CreateTransactionTool;
use crate::tools::create_transaction_group::CreateTransactionGroupTool;
use crate::tools::list_accounts::ListAccountsTool;
use crate::tools::search_assets::SearchAssetsTool;
use crate::tools::search_categories::SearchCategoriesTool;
use crate::tools::search_transactions::SearchTransactionsTool;
use gemini::completion::gemini_api_types::{
    AdditionalParameters, GenerationConfig, ThinkingConfig,
};

const SYSTEM_PROMPT: &str = r#"You are Myra, a personal finance assistant. You help users understand their spending, income, and financial patterns by querying their transaction data.

## Rules
- ALWAYS use the available tools to query data before answering questions. Never guess or make up financial data.
- When listing multiple items, use markdown tables for clarity.
- Format currency amounts with 2 decimal places.
- In the data model, negative quantities represent money going out (spending/expenses), and positive quantities represent money coming in (income/deposits).
- When the user mentions relative dates like "last month", "this week", "last year", calculate the actual date range based on the current date provided below.
- Be concise and helpful. If you cannot find relevant data, say so clearly.
- When showing totals, make sure to clarify whether values are spending (negative) or income (positive).

## Transaction Creation
- When the user asks to create, add, or record a transaction, first call search_categories and search_assets (and list_accounts) to discover valid IDs.
- For multiple related transactions, prefer create_transaction_group to submit them in a single call. For a single transaction, use create_transaction.
- Call the tool directly. Do NOT ask the user to confirm first — the UI will show an approval card with Accept/Reject buttons.
- After the user approves and the transaction is created, respond with a ONE sentence confirmation. Do NOT re-call lookup tools (list_accounts, search_categories, search_assets) — you already have the IDs from the earlier turn. Do NOT show a table or repeat the full details.
- If the user's original request included additional work beyond the approved transaction, continue with that work immediately using the IDs you already have.

## Current date
{current_date}
"#;

pub fn build_chat_agent_for_user<D: AiDataProvider, A: AiActionProvider>(
    config: AiConfig,
    data: Arc<D>,
    actions: Arc<A>,
) -> Agent<gemini::completion::CompletionModel> {
    let client = create_gemini_client(&config.api_key);
    let embedding_model =
        client.embedding_model_with_ndims(&config.embedding_model, EMBEDDING_DIMS);

    let current_date = time::OffsetDateTime::now_utc().date().to_string();
    let preamble = SYSTEM_PROMPT.replace("{current_date}", &current_date);

    client
        .agent(&config.model)
        .preamble(&preamble)
        .max_tokens(16384)
        .default_max_turns(5)
        .additional_params(
            serde_json::to_value(
                AdditionalParameters::default().with_config(GenerationConfig {
                    thinking_config: Some(build_thinking_config(&config.model)),
                    ..Default::default()
                }),
            )
            .unwrap(),
        )
        .tool(SearchTransactionsTool::new(
            data.clone(),
            embedding_model.clone(),
        ))
        .tool(AggregateTransactionsTool::new(data.clone()))
        .tool(ListAccountsTool::new(data.clone()))
        .tool(SearchCategoriesTool::new(
            data.clone(),
            embedding_model.clone(),
        ))
        .tool(SearchAssetsTool::new(data.clone(), embedding_model.clone()))
        .tool(CreateTransactionTool::new(actions.clone()))
        .tool(CreateTransactionGroupTool::new(actions.clone()))
        .build()
}

fn build_thinking_config(model: &str) -> ThinkingConfig {
    if model.starts_with("gemini-3") {
        ThinkingConfig {
            thinking_budget: None,
            thinking_level: Some(gemini::completion::gemini_api_types::ThinkingLevel::Medium),
            include_thoughts: Some(true),
        }
    } else {
        ThinkingConfig {
            thinking_budget: Some(2048),
            thinking_level: None,
            include_thoughts: Some(true),
        }
    }
}
