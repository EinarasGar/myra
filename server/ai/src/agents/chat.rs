use std::sync::Arc;

use futures::{Stream, StreamExt};
use rig::agent::{Agent, MultiTurnStreamItem};
use rig::client::{CompletionClient, EmbeddingsClient};
use rig::embeddings::EmbeddingModel;
use rig::providers::gemini;
use rig::streaming::{StreamedAssistantContent, StreamedUserContent, StreamingChat};
use uuid::Uuid;

use crate::config::AiConfig;
use crate::data_provider::AiDataProvider;
use crate::embedding::EMBEDDING_DIMS;
use crate::models::chat::{ChatHistoryMessage, ChatStreamEvent};
use crate::provider::create_gemini_client;
use crate::tools::account_tools::ListAccountsTool;

use crate::tools::transaction_tools::{AggregateTransactionsTool, SearchTransactionsTool};
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

## Current date
{current_date}
"#;

fn build_chat_agent<M: EmbeddingModel + Clone + 'static, D: AiDataProvider>(
    client: &gemini::Client,
    model: &str,
    data: Arc<D>,
    user_id: Uuid,
    embedding_model: M,
) -> Agent<gemini::completion::CompletionModel> {
    let current_date = time::OffsetDateTime::now_utc().date().to_string();

    let preamble = SYSTEM_PROMPT.replace("{current_date}", &current_date);

    client
        .agent(model)
        .preamble(&preamble)
        .max_tokens(16384)
        .default_max_turns(5)
        .additional_params(
            serde_json::to_value(
                AdditionalParameters::default().with_config(GenerationConfig {
                    thinking_config: Some(build_thinking_config(model)),
                    ..Default::default()
                }),
            )
            .unwrap(),
        )
        .tool(SearchTransactionsTool::new(
            data.clone(),
            user_id,
            embedding_model,
        ))
        .tool(AggregateTransactionsTool::new(data.clone(), user_id))
        .tool(ListAccountsTool::new(data, user_id))
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

pub async fn run_chat_stream<D: AiDataProvider>(
    config: AiConfig,
    data: Arc<D>,
    user_id: Uuid,
    message: String,
    history: Vec<ChatHistoryMessage>,
) -> impl Stream<Item = ChatStreamEvent> {
    async_stream::stream! {
        let client = create_gemini_client(&config.api_key);
        let embedding_model =
            client.embedding_model_with_ndims(&config.embedding_model, EMBEDDING_DIMS);

        let agent = build_chat_agent(&client, &config.model, data, user_id, embedding_model);

        let rig_history: Vec<rig::completion::message::Message> =
            history.into_iter().map(Into::into).collect();

        let mut stream = agent
            .stream_chat(&message, rig_history)
            .multi_turn(5)
            .await;

        let mut last_tool_name = String::new();

        while let Some(item) = stream.next().await {
            match item {
                Ok(MultiTurnStreamItem::StreamAssistantItem(
                    StreamedAssistantContent::Text(text),
                )) => {
                    yield ChatStreamEvent::Text(text.text);
                }
                Ok(MultiTurnStreamItem::StreamAssistantItem(
                    StreamedAssistantContent::ToolCall { tool_call, .. },
                )) => {
                    last_tool_name = tool_call.function.name.clone();
                    yield ChatStreamEvent::ToolCall {
                        name: tool_call.function.name,
                        input: tool_call.function.arguments,
                    };
                }
                Ok(MultiTurnStreamItem::StreamUserItem(
                    StreamedUserContent::ToolResult { tool_result, .. },
                )) => {
                    let raw = match tool_result.content.first() {
                        rig::completion::message::ToolResultContent::Text(t) => t.text.clone(),
                        _ => String::new(),
                    };
                    let output = serde_json::from_str::<String>(&raw).unwrap_or(raw);
                    yield ChatStreamEvent::ToolResult {
                        name: last_tool_name.clone(),
                        output,
                    };
                }
                Ok(MultiTurnStreamItem::StreamAssistantItem(
                    StreamedAssistantContent::Reasoning(r),
                )) => {
                    let text = r.content.iter().filter_map(|c| match c {
                        rig::completion::message::ReasoningContent::Text { text, .. } => Some(text.as_str()),
                        _ => None,
                    }).collect::<Vec<_>>().join("");
                    if !text.is_empty() {
                        yield ChatStreamEvent::Reasoning(text);
                    }
                }
                Ok(MultiTurnStreamItem::StreamAssistantItem(
                    StreamedAssistantContent::ReasoningDelta { reasoning, .. },
                )) => {
                    if !reasoning.is_empty() {
                        yield ChatStreamEvent::Reasoning(reasoning);
                    }
                }
                Ok(_) => {}
                Err(e) => {
                    yield ChatStreamEvent::Error(e.to_string());
                    break;
                }
            }
        }
    }
}
