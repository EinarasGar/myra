use std::sync::Arc;

use futures::{Stream, StreamExt};
use rig::agent::{Agent, MultiTurnStreamItem};
use rig::client::{CompletionClient, EmbeddingsClient};
use rig::completion::message::{Message, ToolResultContent, UserContent};
use rig::embeddings::EmbeddingModel;
use rig::providers::gemini;
use rig::streaming::{StreamedAssistantContent, StreamedUserContent, StreamingChat};
use rig::OneOrMany;
use uuid::Uuid;

use crate::action_provider::AiActionProvider;
use crate::config::AiConfig;
use crate::data_provider::AiDataProvider;
use crate::embedding::EMBEDDING_DIMS;
use crate::models::chat::{ChatHistoryMessage, ChatStreamEvent, ToolRequestPayload};
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

use super::approval::{build_gated_toolset, ApprovalHook};
use super::chat_utils::{attachment_to_user_content, find_tool_call_in_history};

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

fn build_chat_agent<M: EmbeddingModel + Clone + 'static, D: AiDataProvider, A: AiActionProvider>(
    client: &gemini::Client,
    model: &str,
    data: Arc<D>,
    actions: Arc<A>,
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
            embedding_model.clone(),
        ))
        .tool(AggregateTransactionsTool::new(data.clone(), user_id))
        .tool(ListAccountsTool::new(data.clone(), user_id))
        .tool(SearchCategoriesTool::new(
            data.clone(),
            user_id,
            embedding_model.clone(),
        ))
        .tool(SearchAssetsTool::new(
            data.clone(),
            user_id,
            embedding_model.clone(),
        ))
        .tool(CreateTransactionTool::new(actions.clone(), user_id))
        .tool(CreateTransactionGroupTool::new(actions.clone(), user_id))
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

pub async fn run_chat_stream<D: AiDataProvider, A: AiActionProvider>(
    config: AiConfig,
    data: Arc<D>,
    actions: Arc<A>,
    user_id: Uuid,
    message: Option<String>,
    images: Option<Vec<crate::models::chat::Base64Image>>,
    history: Vec<ChatHistoryMessage>,
) -> impl Stream<Item = ChatStreamEvent> {
    async_stream::stream! {
        let client = create_gemini_client(&config.api_key);
        let embedding_model =
            client.embedding_model_with_ndims(&config.embedding_model, EMBEDDING_DIMS);

        let gated = build_gated_toolset(actions.clone(), user_id);

        // Process history: handle ToolApproval entries by executing or declining them
        let mut rig_history: Vec<Message> = Vec::new();
        for msg in history {
            match msg {
                ChatHistoryMessage::ToolApproval { tool_call_id, approved } => {
                    let Some((name, args)) = find_tool_call_in_history(&rig_history, &tool_call_id) else {
                        yield ChatStreamEvent::Error(
                            format!("No matching tool call found for approval: {tool_call_id}")
                        );
                        continue;
                    };

                    let result_str = if approved {
                        match gated.toolset.call(&name, args.clone()).await {
                            Ok(r) => {
                                yield ChatStreamEvent::ToolResult {
                                    name: name.clone(),
                                    output: r.clone(),
                                };
                                r
                            }
                            Err(e) => {
                                let err_msg = format!("Tool execution failed: {e}");
                                yield ChatStreamEvent::ToolResult {
                                    name: name.clone(),
                                    output: err_msg.clone(),
                                };
                                err_msg
                            }
                        }
                    } else {
                        "User declined this action.".to_string()
                    };

                    rig_history.push(Message::User {
                        content: OneOrMany::one(UserContent::tool_result(
                            tool_call_id,
                            OneOrMany::one(ToolResultContent::text(result_str)),
                        )),
                    });
                }
                other => rig_history.push(other.into()),
            }
        }

        // Set up the approval hook channel
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<ToolRequestPayload>();
        let hook = ApprovalHook { sender: tx, gated_names: gated.gated_names.clone() };

        let agent = build_chat_agent(&client, &config.model, data, actions, user_id, embedding_model);

        // Build the prompt message
        let chat_prompt: Message = if let Some(ref msg) = message {
            if let Some(imgs) = images {
                if !imgs.is_empty() {
                    let mut user_contents: Vec<UserContent> = vec![UserContent::text(msg)];
                    for att in &imgs {
                        match attachment_to_user_content(att) {
                            Some(uc) => user_contents.push(uc),
                            None => tracing::warn!(
                                media_type = %att.media_type,
                                "Skipping unsupported attachment"
                            ),
                        }
                    }
                    Message::User {
                        content: OneOrMany::many(user_contents)
                            .unwrap_or_else(|_| OneOrMany::one(UserContent::text(msg))),
                    }
                } else {
                    Message::user(msg)
                }
            } else {
                Message::user(msg)
            }
        } else {
            // Approval turn: the last entry in rig_history is the ToolResult
            // from processing the ToolApproval above. Pop it and use it as
            // the prompt — this matches Rig's internal multi-turn loop where
            // the ToolResult is the input that triggers the next LLM turn.
            match rig_history.pop() {
                Some(msg) => msg,
                None => {
                    yield ChatStreamEvent::Error(
                        "Approval turn received but no tool result in history".to_string()
                    );
                    return;
                }
            }
        };

        let mut stream = agent
            .stream_chat(chat_prompt, rig_history)
            .with_hook(hook)
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
                    StreamedAssistantContent::ToolCall { tool_call, internal_call_id },
                )) => {
                    let call_id = tool_call.call_id.clone().unwrap_or(internal_call_id);
                    last_tool_name = tool_call.function.name.clone();
                    yield ChatStreamEvent::ToolCall {
                        call_id,
                        name: tool_call.function.name,
                        input: tool_call.function.arguments,
                        signature: tool_call.signature,
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
                Ok(MultiTurnStreamItem::FinalResponse(final_resp)) => {
                    yield ChatStreamEvent::Usage {
                        input_tokens: final_resp.usage().input_tokens,
                        output_tokens: final_resp.usage().output_tokens,
                    };
                }
                Ok(_) => {}
                Err(e) => {
                    let err_str = e.to_string();
                    // Terminate from approval hook is expected, not a real error
                    if !err_str.contains("PromptCancelled") {
                        yield ChatStreamEvent::Error(err_str);
                    }
                    break;
                }
            }
        }

        // Drain any pending tool request events from the hook
        while let Ok(payload) = rx.try_recv() {
            match serde_json::from_str(&payload.args) {
                Ok(args) => {
                    yield ChatStreamEvent::ToolRequest {
                        tool_call_id: payload.tool_call_id,
                        name: payload.name,
                        args,
                    };
                }
                Err(e) => {
                    yield ChatStreamEvent::Error(
                        format!("Failed to parse tool arguments for {}: {e}", payload.name)
                    );
                }
            }
        }
    }
}
