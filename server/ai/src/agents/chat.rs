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
use crate::tools::create_custom_asset::CreateCustomAssetTool;
use crate::tools::create_transaction::CreateTransactionTool;
use crate::tools::create_transaction_group::CreateTransactionGroupTool;
use crate::tools::list_accounts::ListAccountsTool;
use crate::tools::record_asset_trade::RecordAssetTradeTool;
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

## Custom Asset Creation
- When the user asks to add, create, or track an asset (stock, ETF, crypto, etc.) that isn't already in their list, first call search_assets to confirm it's missing AND to find the base_pair_id (the currency the asset is denominated in — usually USD or EUR).
- Then call create_custom_asset. The UI will show an approval card; do not ask for confirmation in chat.
- asset_type values: 1=Currencies, 2=Stocks, 3=Bonds, 4=Mutual Funds, 5=ETFs, 6=ETCs, 7=Cryptocurrencies, 8=Real Estate.
- After approval, respond with a ONE sentence confirmation. If the user's original request was to add an asset *and then* record a transaction with it, continue with the transaction using the new asset_id from the result.

## Asset Trades (Buying or Selling Stocks, ETFs, Crypto, etc.)
- For any message like "I bought 5 INTC for 200 USD" or "I sold 1 BTC for 60000", use the **record_asset_trade** tool. Do NOT use create_transaction or create_transaction_group for asset trades — record_asset_trade builds the correct two-leg group (cash + asset) under the right category automatically.
- **Resolve the asset_id first via search_assets.** Tickers in this database are exchange-qualified (e.g. `AMZN.NASDAQ`, `INTC.NASDAQ`, `VWCE.DE`), NOT bare like `AMZN`. Call `search_assets` with what the user typed (e.g. "AMZN" or "Amazon"), pick the closest matching asset whose name and type fit the user's intent — prefer US listings (`.NASDAQ`, `.NYSE`, `.US`) for US companies unless the user named a specific exchange. Pass that asset's `asset_id` into record_asset_trade. If multiple plausible matches exist on different exchanges, ask the user which listing they want before calling the tool. If no asset matches, offer to create one with create_custom_asset.
- **Resolve the account_id via list_accounts.** Always call `list_accounts` first; if there are multiple Investment-type accounts, ask the user which to use BEFORE calling record_asset_trade. Pass that account's `account_id` into record_asset_trade.
- Each account from list_accounts may include `identifiers` (objects with `kind` and `value`). To pick an account from a transaction/receipt/statement: for `card_last4`, match the value as the **last 4 digits** shown; for `account_number` and `iban`, match the value **exactly** (ignoring spaces/case). If exactly one account matches, use it without asking.
- Required args: side ("buy" or "sell"), asset_id, account_id, quantity, total_amount. If the user gave a per-unit price, multiply by quantity to get total_amount.
- Currency defaults to the user's default currency, and date defaults to now. **ALWAYS resolve and pass currency_asset_id whenever the user mentions a currency in the message (e.g. "for 200 USD" → call search_assets for "USD" and pass that asset_id as currency_asset_id). You do NOT know the user's default currency — never assume it matches what they said.**
- Call record_asset_trade directly. The UI will show an Accept/Reject approval card; do not ask the user to confirm in chat.

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
        .tool(CreateCustomAssetTool::new(actions.clone()))
        .tool(RecordAssetTradeTool::new(actions.clone()))
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
