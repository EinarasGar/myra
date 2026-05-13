//! Receipt-processing workflow. A thin facade over `Conversation::prompt`:
//! configures the rig agent with receipt-specific prompt + tools, calls the
//! wrapper, then parses the agent's final assistant message into a
//! `Proposal`. All conversation persistence and image fetching is handled
//! by the wrapper — this file is only the workflow's unique parts.

use std::sync::Arc;

use crate::config::AiConfig;
use crate::conversation::Conversation;
use crate::conversation_provider::ConversationProvider;
use crate::data_provider::AiDataProvider;
use crate::embedding::EMBEDDING_DIMS;
pub use crate::models::receipt::ReceiptProcessorOutput;
use crate::provider::create_gemini_client;
use crate::rate_limit_provider::RateLimitProvider;
use crate::tools::list_accounts::ListAccountsTool;
use crate::tools::search_assets::SearchAssetsTool;
use crate::tools::search_categories::SearchCategoriesTool;
use rig::client::{CompletionClient, EmbeddingsClient};
use uuid::Uuid;

const SYSTEM_PROMPT: &str = r#"You are a receipt processing assistant. Your job is to extract transaction details from receipt images.

Analyze the receipt image and extract:
1. The merchant/store name (use as description)
2. The date of the transaction
3. The total amount
4. Individual line items (if visible and distinct)

Use the available tools to:
- Search for matching accounts (the account the money was spent from)
- Search for appropriate categories for the transaction
- Search for the correct currency/asset

After gathering information, produce your final output as a structured JSON object in your LAST message.

If the receipt has multiple distinct items with different categories, output a transaction_group.
If it's a single purchase or all items share the same category, output a single transaction.

Each transaction has exactly ONE entry — the account the money was spent from, the amount, and the asset (currency). The amount must be negative to represent cash going out (e.g. "-73.59" for a purchase). The system handles the accounting automatically.

Your final message MUST be ONLY a valid JSON object (no markdown, no explanation) with this structure:

For a single transaction:
{"proposal_type":"transaction","proposal":{"description":"...","date":"YYYY-MM-DD","account_id":"uuid","amount":"-X.XX","asset_id":N,"category_id":N}}

For a transaction group:
{"proposal_type":"transaction_group","proposal":{"description":"...","date":"YYYY-MM-DD","category_id":N,"transactions":[{"description":"...","date":"YYYY-MM-DD","account_id":"uuid","amount":"-X.XX","asset_id":N,"category_id":N}]}}

If you cannot determine a field, set it to null.
"#;

const INITIAL_USER_PROMPT: &str =
    "Please analyze this receipt and extract the transaction details.";

/// Initial extraction. Records the user prompt with the receipt attachment
/// and runs the agent. The wrapper handles persistence and image resolution.
pub async fn process<D, C, R>(
    config: AiConfig,
    data: Arc<D>,
    conversation: Arc<C>,
    rate_limit: Arc<R>,
    source_file_id: Uuid,
) -> anyhow::Result<ReceiptProcessorOutput>
where
    D: AiDataProvider,
    C: ConversationProvider,
    R: RateLimitProvider,
{
    run_with_prompt(
        config,
        data,
        conversation,
        rate_limit,
        INITIAL_USER_PROMPT.to_string(),
        vec![source_file_id],
    )
    .await
}

/// Apply a user correction. The wrapper loads the prior history (including
/// the receipt image) and runs the agent with the correction text.
pub async fn correct<D, C, R>(
    config: AiConfig,
    data: Arc<D>,
    conversation: Arc<C>,
    rate_limit: Arc<R>,
    correction: String,
) -> anyhow::Result<ReceiptProcessorOutput>
where
    D: AiDataProvider,
    C: ConversationProvider,
    R: RateLimitProvider,
{
    run_with_prompt(config, data, conversation, rate_limit, correction, vec![]).await
}

async fn run_with_prompt<D, C, R>(
    config: AiConfig,
    data: Arc<D>,
    conversation: Arc<C>,
    rate_limit: Arc<R>,
    message: String,
    file_ids: Vec<Uuid>,
) -> anyhow::Result<ReceiptProcessorOutput>
where
    D: AiDataProvider,
    C: ConversationProvider,
    R: RateLimitProvider,
{
    let client = create_gemini_client(&config.api_key);
    let embedding_model =
        client.embedding_model_with_ndims(&config.embedding_model, EMBEDDING_DIMS);

    let agent = client
        .agent(&config.model)
        .preamble(SYSTEM_PROMPT)
        .max_tokens(8192)
        .default_max_turns(5)
        .tool(ListAccountsTool::new(data.clone()))
        .tool(SearchCategoriesTool::new(
            data.clone(),
            embedding_model.clone(),
        ))
        .tool(SearchAssetsTool::new(data.clone(), embedding_model.clone()))
        .build();

    let conv = Conversation::new(conversation, rate_limit);
    let output = conv.prompt(agent, message, file_ids).await?;

    parse_proposal(&output.output)
}

fn parse_proposal(output: &str) -> anyhow::Result<ReceiptProcessorOutput> {
    let trimmed = output.trim();

    let parsed: serde_json::Value = serde_json::from_str(trimmed).map_err(|e| {
        anyhow::anyhow!("Failed to parse proposal JSON: {e}. Output was: {trimmed}")
    })?;

    let proposal_type = parsed
        .get("proposal_type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Missing proposal_type in output"))?
        .to_string();

    let proposal = parsed
        .get("proposal")
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Missing proposal in output"))?;

    Ok(ReceiptProcessorOutput {
        proposal_type,
        proposal,
    })
}
