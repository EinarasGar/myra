use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use futures::{Stream, StreamExt};
use rig::agent::{Agent, MultiTurnStreamItem};
use rig::completion::message::{Message, ToolResultContent, UserContent};
use rig::completion::Prompt;
use rig::streaming::{StreamedAssistantContent, StreamedUserContent, StreamingChat};
use rig::OneOrMany;
use uuid::Uuid;

use crate::action_provider::AiActionProvider;
use crate::agents::approval::{build_gated_toolset, ApprovalHook};
use crate::agents::chat_utils::{find_tool_call_in_history, parse_image_media_type};
use crate::conversation_provider::ConversationProvider;
use crate::models::chat::{
    Base64Image, ChatHistoryMessage, ChatStreamEvent, HistoryEntry, PromptOutput,
    ToolRequestPayload,
};
use crate::rate_limit_provider::RateLimitProvider;

pub struct Conversation<C, R>
where
    C: ConversationProvider,
    R: RateLimitProvider,
{
    conversation: Arc<C>,
    rate_limit: Arc<R>,
}

impl<C, R> Conversation<C, R>
where
    C: ConversationProvider,
    R: RateLimitProvider,
{
    pub fn new(conversation: Arc<C>, rate_limit: Arc<R>) -> Self {
        Self {
            conversation,
            rate_limit,
        }
    }

    pub async fn prompt<M>(
        &self,
        agent: Agent<M>,
        message: String,
        file_ids: Vec<Uuid>,
    ) -> anyhow::Result<PromptOutput>
    where
        M: rig::completion::CompletionModel + 'static,
    {
        let prepared = self.prepare(message, file_ids, false).await?;

        let response_result = agent
            .prompt(prepared.current_message)
            .with_history(&mut prepared.rig_history.clone())
            .extended_details()
            .max_turns(5)
            .await;

        let response = match response_result {
            Ok(r) => r,
            Err(e) => {
                self.rate_limit.release().await;
                return Err(anyhow::anyhow!("Agent prompt failed: {e}"));
            }
        };

        let history_messages = convert_messages_to_history(response.messages.unwrap_or_default());
        for msg in history_messages {
            if matches!(
                msg,
                ChatHistoryMessage::User { .. } | ChatHistoryMessage::ToolApproval { .. }
            ) {
                continue;
            }
            if let Err(e) = self.conversation.append_message(msg).await {
                tracing::warn!("Failed to persist response message: {e}");
            }
        }

        let usage = &response.usage;
        self.rate_limit
            .record_usage(usage.input_tokens, usage.output_tokens)
            .await;

        Ok(PromptOutput {
            output: response.output,
        })
    }

    pub async fn stream_with_approval<A>(
        &self,
        agent: Agent<rig::providers::gemini::completion::CompletionModel>,
        actions: Arc<A>,
        message: String,
        file_ids: Vec<Uuid>,
        tool_approval: Option<(String, bool)>,
    ) -> anyhow::Result<impl Stream<Item = ChatStreamEvent>>
    where
        A: AiActionProvider,
    {
        let is_approval_turn = tool_approval.is_some();

        if let Some((ref tool_call_id, approved)) = tool_approval {
            self.conversation
                .append_message(ChatHistoryMessage::ToolApproval {
                    tool_call_id: tool_call_id.clone(),
                    approved,
                })
                .await?;
        }

        let prepared = self
            .prepare(message.clone(), file_ids, is_approval_turn)
            .await?;

        let gated = build_gated_toolset(actions);
        let mut rig_history: Vec<Message> = Vec::new();
        let mut deferred_results: Vec<ChatStreamEvent> = Vec::new();

        let executed_call_ids: HashSet<String> = prepared
            .history_entries
            .iter()
            .filter_map(|e| match &e.message {
                ChatHistoryMessage::ToolResult { tool_call_id, .. } => Some(tool_call_id.clone()),
                _ => None,
            })
            .collect();

        for entry in prepared.history_entries {
            match entry.message {
                ChatHistoryMessage::ToolApproval {
                    tool_call_id,
                    approved,
                } if !executed_call_ids.contains(tool_call_id.as_str()) => {
                    let Some((name, args)) = find_tool_call_in_history(&rig_history, &tool_call_id)
                    else {
                        deferred_results.push(ChatStreamEvent::Error(format!(
                            "No matching tool call found for approval: {tool_call_id}"
                        )));
                        continue;
                    };
                    let result_str = if approved {
                        match gated.toolset.call(&name, args.clone()).await {
                            Ok(r) => {
                                deferred_results.push(ChatStreamEvent::ToolResult {
                                    name: name.clone(),
                                    output: r.clone(),
                                });
                                r
                            }
                            Err(e) => {
                                let msg = format!("Tool execution failed: {e}");
                                deferred_results.push(ChatStreamEvent::ToolResult {
                                    name: name.clone(),
                                    output: msg.clone(),
                                });
                                msg
                            }
                        }
                    } else {
                        "User declined this action.".to_string()
                    };
                    let _ = self
                        .conversation
                        .append_message(ChatHistoryMessage::ToolResult {
                            tool_call_id: tool_call_id.clone(),
                            content: result_str.clone(),
                        })
                        .await;
                    rig_history.push(Message::User {
                        content: OneOrMany::one(UserContent::tool_result(
                            tool_call_id,
                            OneOrMany::one(ToolResultContent::text(result_str)),
                        )),
                    });
                }
                ChatHistoryMessage::ToolApproval { .. } => {}
                ChatHistoryMessage::User { ref content } if !entry.file_ids.is_empty() => {
                    let imgs: Vec<Base64Image> = entry
                        .file_ids
                        .iter()
                        .filter_map(|id| prepared.images_by_id.get(id).cloned())
                        .collect();
                    rig_history.push(build_user_message(content, &imgs));
                }
                other => rig_history.push(other.into()),
            }
        }

        let chat_prompt: Message = if is_approval_turn {
            match rig_history.pop() {
                Some(msg) => msg,
                None => {
                    return Err(anyhow::anyhow!(
                        "Approval turn received but no tool result in history"
                    ));
                }
            }
        } else {
            prepared.current_message
        };

        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<ToolRequestPayload>();
        let hook = ApprovalHook {
            sender: tx,
            gated_names: gated.gated_names.clone(),
        };

        let conversation = self.conversation.clone();
        let rate_limit = self.rate_limit.clone();

        Ok(async_stream::stream! {
            for ev in deferred_results { yield ev; }

            let mut rig_stream = agent
                .stream_chat(chat_prompt, rig_history)
                .with_hook(hook)
                .multi_turn(5)
                .await;

            let mut pending_text = String::new();
            let mut last_tool_name = String::new();
            let mut last_tool_call_id = String::new();
            let mut usage_recorded = false;

            while let Some(item) = rig_stream.next().await {
                match item {
                    Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(t))) => {
                        pending_text.push_str(&t.text);
                        yield ChatStreamEvent::Text(t.text);
                    }
                    Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::ToolCall { tool_call, internal_call_id })) => {
                        if !pending_text.is_empty() {
                            let _ = conversation.append_message(ChatHistoryMessage::Assistant {
                                content: std::mem::take(&mut pending_text),
                            }).await;
                        }
                        let call_id = tool_call.call_id.clone().unwrap_or(internal_call_id);
                        let name = tool_call.function.name.clone();
                        let args_str = serde_json::to_string(&tool_call.function.arguments).unwrap_or_default();
                        let signature = tool_call.signature.clone();

                        let _ = conversation.append_message(ChatHistoryMessage::AssistantToolCall {
                            tool_call_id: call_id.clone(),
                            name: name.clone(),
                            args: args_str,
                            signature: signature.clone(),
                        }).await;

                        last_tool_name = name.clone();
                        last_tool_call_id = call_id.clone();
                        yield ChatStreamEvent::ToolCall {
                            call_id,
                            name,
                            input: tool_call.function.arguments,
                            signature,
                        };
                    }
                    Ok(MultiTurnStreamItem::StreamUserItem(StreamedUserContent::ToolResult { tool_result, .. })) => {
                        let raw = match tool_result.content.first() {
                            ToolResultContent::Text(t) => t.text.clone(),
                            _ => String::new(),
                        };
                        let output = serde_json::from_str::<String>(&raw).unwrap_or(raw);
                        let _ = conversation.append_message(ChatHistoryMessage::ToolResult {
                            tool_call_id: last_tool_call_id.clone(),
                            content: output.clone(),
                        }).await;
                        yield ChatStreamEvent::ToolResult { name: last_tool_name.clone(), output };
                    }
                    Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Reasoning(r))) => {
                        let text = r.content.iter().filter_map(|c| match c {
                            rig::completion::message::ReasoningContent::Text { text, .. } => Some(text.as_str()),
                            _ => None,
                        }).collect::<Vec<_>>().join("");
                        if !text.is_empty() {
                            yield ChatStreamEvent::Reasoning(text);
                        }
                    }
                    Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::ReasoningDelta { reasoning, .. })) => {
                        if !reasoning.is_empty() {
                            yield ChatStreamEvent::Reasoning(reasoning);
                        }
                    }
                    Ok(MultiTurnStreamItem::FinalResponse(final_resp)) => {
                        let usage = final_resp.usage();
                        rate_limit.record_usage(usage.input_tokens, usage.output_tokens).await;
                        usage_recorded = true;
                        yield ChatStreamEvent::Usage {
                            input_tokens: usage.input_tokens,
                            output_tokens: usage.output_tokens,
                        };
                    }
                    Ok(_) => {}
                    Err(e) => {
                        let err_str = e.to_string();
                        if !err_str.contains("PromptCancelled") {
                            yield ChatStreamEvent::Error(err_str);
                        }
                        break;
                    }
                }
            }

            if !pending_text.is_empty() {
                let _ = conversation.append_message(ChatHistoryMessage::Assistant {
                    content: pending_text,
                }).await;
            }

            if !usage_recorded {
                rate_limit.release().await;
            }

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
                        yield ChatStreamEvent::Error(format!(
                            "Failed to parse tool arguments for {}: {e}", payload.name
                        ));
                    }
                }
            }
        })
    }

    async fn prepare(
        &self,
        message: String,
        file_ids: Vec<Uuid>,
        skip_record: bool,
    ) -> anyhow::Result<PreparedTurn> {
        let history_entries = self.conversation.load_history().await?;

        let mut all_ids: Vec<Uuid> = Vec::new();
        for e in &history_entries {
            all_ids.extend(e.file_ids.iter().copied());
        }
        let history_id_count = all_ids.len();
        all_ids.extend(file_ids.iter().copied());

        let all_images = if all_ids.is_empty() {
            Vec::new()
        } else {
            self.conversation.fetch_images(&all_ids).await?
        };

        let images_by_id: HashMap<Uuid, Base64Image> = all_ids
            .iter()
            .take(history_id_count)
            .copied()
            .zip(all_images.iter().take(history_id_count).cloned())
            .collect();
        let current_images: Vec<Base64Image> =
            all_images.into_iter().skip(history_id_count).collect();

        let history_messages: Vec<ChatHistoryMessage> =
            history_entries.iter().map(|e| e.message.clone()).collect();
        self.rate_limit
            .pre_check(&message, &current_images, &history_messages)
            .await
            .map_err(anyhow::Error::new)?;

        if !skip_record {
            self.conversation
                .record_user_message(message.clone(), &file_ids)
                .await?;
        }

        let rig_history = build_rig_history(&history_entries, &images_by_id);
        let current_message = build_user_message(&message, &current_images);

        Ok(PreparedTurn {
            rig_history,
            current_message,
            history_entries,
            images_by_id,
        })
    }
}

struct PreparedTurn {
    rig_history: Vec<Message>,
    current_message: Message,
    history_entries: Vec<HistoryEntry>,
    images_by_id: HashMap<Uuid, Base64Image>,
}

fn build_user_message(text: &str, images: &[Base64Image]) -> Message {
    if images.is_empty() {
        return Message::user(text);
    }

    let mut contents: Vec<UserContent> = vec![UserContent::text(text)];
    for img in images {
        if let Some(media_type) = parse_image_media_type(&img.media_type) {
            contents.push(UserContent::image_base64(
                img.data.clone(),
                Some(media_type),
                None,
            ));
        }
    }
    Message::User {
        content: OneOrMany::many(contents)
            .unwrap_or_else(|_| OneOrMany::one(UserContent::text(text))),
    }
}

fn build_rig_history(
    entries: &[HistoryEntry],
    images_by_id: &HashMap<Uuid, Base64Image>,
) -> Vec<Message> {
    let mut out = Vec::with_capacity(entries.len());
    for entry in entries {
        match &entry.message {
            ChatHistoryMessage::User { content } if !entry.file_ids.is_empty() => {
                let imgs: Vec<Base64Image> = entry
                    .file_ids
                    .iter()
                    .filter_map(|id| images_by_id.get(id).cloned())
                    .collect();
                out.push(build_user_message(content, &imgs));
            }
            ChatHistoryMessage::ToolApproval { .. } => {}
            _ => out.push(entry.message.clone().into()),
        }
    }
    out
}

fn convert_messages_to_history(messages: Vec<Message>) -> Vec<ChatHistoryMessage> {
    messages
        .into_iter()
        .flat_map(message_to_history_items)
        .collect()
}

fn message_to_history_items(message: Message) -> Vec<ChatHistoryMessage> {
    use rig::completion::message::AssistantContent;
    match message {
        Message::User { content } => {
            let mut items = Vec::new();
            for item in content.iter() {
                match item {
                    UserContent::Text(t) => items.push(ChatHistoryMessage::User {
                        content: t.text.clone(),
                    }),
                    UserContent::ToolResult(tr) => {
                        let content_text = tr
                            .content
                            .iter()
                            .filter_map(|c| match c {
                                ToolResultContent::Text(t) => Some(t.text.clone()),
                                _ => None,
                            })
                            .collect::<Vec<_>>()
                            .join("\n");
                        items.push(ChatHistoryMessage::ToolResult {
                            tool_call_id: tr.id.clone(),
                            content: content_text,
                        });
                    }
                    _ => {}
                }
            }
            items
        }
        Message::Assistant { content, .. } => {
            let mut items = Vec::new();
            for item in content.iter() {
                match item {
                    AssistantContent::Text(t) => items.push(ChatHistoryMessage::Assistant {
                        content: t.text.clone(),
                    }),
                    AssistantContent::ToolCall(tc) => {
                        let args = serde_json::to_string(&tc.function.arguments)
                            .unwrap_or_else(|_| "{}".to_string());
                        let call_id = tc.call_id.clone().unwrap_or_else(|| tc.id.clone());
                        items.push(ChatHistoryMessage::AssistantToolCall {
                            tool_call_id: call_id,
                            name: tc.function.name.clone(),
                            args,
                            signature: tc.signature.clone(),
                        });
                    }
                    _ => {}
                }
            }
            items
        }
    }
}
