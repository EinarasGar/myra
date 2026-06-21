use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use futures::{Stream, StreamExt};
use rig::agent::{Agent, MultiTurnStreamItem};
use rig::completion::message::{AssistantContent, Message, ToolResultContent, UserContent};
use rig::completion::Prompt;
use rig::streaming::{StreamedAssistantContent, StreamedUserContent, StreamingChat};
use rig::OneOrMany;
use uuid::Uuid;

use crate::action_provider::AiActionProvider;
use crate::agents::approval::{build_gated_toolset, ApprovalHook};
use crate::agents::chat_utils::{attachment_to_user_content, find_tool_call_in_history};
use crate::conversation_provider::ConversationProvider;
use crate::models::chat::{
    Base64Attachment, ChatHistoryMessage, ChatStreamEvent, ChatTurn, HistoryEntry, Persistence,
    PromptOutput, ToolRequestPayload,
};
use crate::models::error::AiError;
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

    #[tracing::instrument(skip_all, err)]
    pub async fn run<M>(
        &self,
        agent: Agent<M>,
        turn: ChatTurn,
        persistence: Persistence,
    ) -> Result<PromptOutput, AiError>
    where
        M: rig::completion::CompletionModel + 'static,
    {
        let persist = persistence == Persistence::Persist;
        let prepared = match turn {
            ChatTurn::Message { message, file_ids } => {
                self.prepare_new(message, file_ids, !persist).await?
            }
            ChatTurn::Continuation => self.prepare_continuation().await?,
            ChatTurn::Approval { .. } => {
                return Err(AiError::Fatal {
                    detail: "Approval turns require the streaming API".to_string(),
                })
            }
        };
        self.run_prepared(agent, prepared, persist).await
    }

    #[tracing::instrument(skip_all, err)]
    async fn run_prepared<M>(
        &self,
        agent: Agent<M>,
        prepared: PreparedTurn,
        persist: bool,
    ) -> Result<PromptOutput, AiError>
    where
        M: rig::completion::CompletionModel + 'static,
    {
        if persist {
            self.clear_turn_error_marker().await;
        }

        // rig returns the full conversation (`[fed history..., prompt, new...]`).
        // Everything up to and including the prompt is already persisted, so we
        // only persist the suffix produced this turn (see `messages_to_persist`).
        let history_len = prepared.rig_history.len();

        let response_result = agent
            .prompt(prepared.current_message)
            .with_history(&mut prepared.rig_history.clone())
            .extended_details()
            .await;

        let response = match response_result {
            Ok(r) => r,
            Err(e) => {
                self.rate_limit.release().await;
                let err = AiError::from(e);
                if persist {
                    if let Err(pe) = self.conversation.record_turn_error(&err).await {
                        tracing::warn!("Failed to persist turn error: {pe}");
                    }
                }
                return Err(err);
            }
        };

        if persist {
            let new_messages =
                messages_to_persist(response.messages.unwrap_or_default(), history_len);
            for msg in new_messages {
                if let Err(e) = self.conversation.append_message(msg).await {
                    tracing::warn!("Failed to persist response message: {e}");
                }
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

    #[tracing::instrument(skip_all, err)]
    pub async fn stream<A>(
        &self,
        agent: Agent<rig::providers::gemini::completion::CompletionModel>,
        actions: Arc<A>,
        turn: ChatTurn,
    ) -> Result<impl Stream<Item = ChatStreamEvent>, AiError>
    where
        A: AiActionProvider,
    {
        let (message, file_ids, skip_record) = match &turn {
            ChatTurn::Message { message, file_ids } => (message.clone(), file_ids.clone(), false),
            ChatTurn::Approval { approvals } => {
                for (tool_call_id, approved) in approvals {
                    self.conversation
                        .append_message(ChatHistoryMessage::ToolApproval {
                            tool_call_id: tool_call_id.clone(),
                            approved: *approved,
                        })
                        .await
                        .map_err(|e| AiError::unknown(format!("{e:#}")))?;
                }
                (String::new(), Vec::new(), true)
            }
            ChatTurn::Continuation => (String::new(), Vec::new(), true),
        };

        let prepared = self.prepare_new(message, file_ids, skip_record).await?;
        // Only continuation turns look back at the last persisted message;
        // don't clone a potentially large payload for the others.
        let last_history_message = matches!(turn, ChatTurn::Continuation)
            .then(|| prepared.history_entries.last().map(|e| e.message.clone()))
            .flatten();

        let gated = build_gated_toolset(actions);
        let mut rig_history: Vec<Message> = Vec::new();
        let mut deferred_results: Vec<ChatStreamEvent> = Vec::new();

        let mut executed_call_ids: HashSet<String> = prepared
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
                        deferred_results.push(ChatStreamEvent::Error(AiError::unknown(format!(
                            "No matching tool call found for approval: {tool_call_id}"
                        ))));
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
                    executed_call_ids.insert(tool_call_id.clone());
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
                    let imgs: Vec<Base64Attachment> = entry
                        .file_ids
                        .iter()
                        .filter_map(|id| prepared.images_by_id.get(id).cloned())
                        .collect();
                    rig_history.push(build_user_message(content, &imgs));
                }
                other => rig_history.push(other.into()),
            }
        }

        let mut rig_history = coalesce_tool_messages(rig_history);

        let chat_prompt_result: Result<Message, AiError> = match turn {
            ChatTurn::Message { .. } => Ok(prepared.current_message),
            ChatTurn::Approval { .. } => rig_history.pop().ok_or_else(|| AiError::Fatal {
                detail: "Approval turn received but no tool result in history".to_string(),
            }),
            ChatTurn::Continuation => {
                match continuation_prompt(last_history_message.as_ref(), &mut rig_history) {
                    Ok((prompt, synthetic)) => match synthetic {
                        Some(synthetic) => self
                            .conversation
                            .append_message(synthetic)
                            .await
                            .map(|()| prompt)
                            .map_err(|e| AiError::unknown(format!("{e:#}"))),
                        None => Ok(prompt),
                    },
                    Err(e) => Err(e),
                }
            }
        };
        let chat_prompt = match chat_prompt_result {
            Ok(m) => m,
            Err(e) => {
                self.rate_limit.release().await;
                return Err(e);
            }
        };
        self.clear_turn_error_marker().await;

        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<ToolRequestPayload>();
        let gated_names = gated.gated_names.clone();
        let hook = ApprovalHook::new(tx, gated.gated_names.clone());

        let conversation = self.conversation.clone();
        let rate_limit = self.rate_limit.clone();

        Ok(async_stream::stream! {
            for ev in deferred_results { yield ev; }

            let mut thinking_span: Option<tracing::Span> = None;

            let mut rig_stream = agent
                .stream_chat(chat_prompt, rig_history)
                .with_hook(hook)
                .multi_turn(8)
                .await;

            let mut pending_text = String::new();
            let mut last_tool_name = String::new();
            let mut last_tool_call_id = String::new();
            let mut usage_recorded = false;
            let mut error_yielded = false;
            let mut paused_for_approval = false;

            while let Some(item) = rig_stream.next().await {
                match item {
                    Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(t))) => {
                        let _ = thinking_span.take();
                        pending_text.push_str(&t.text);
                        yield ChatStreamEvent::Text(t.text);
                    }
                    Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::ToolCall { tool_call, internal_call_id })) => {
                        let _ = thinking_span.take();
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
                    Ok(MultiTurnStreamItem::StreamUserItem(StreamedUserContent::ToolResult { .. })) if gated_names.contains(&last_tool_name) => {}
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
                        if thinking_span.is_none() {
                            thinking_span = Some(tracing::info_span!("thinking"));
                        }
                        let text = r.content.iter().filter_map(|c| match c {
                            rig::completion::message::ReasoningContent::Text { text, .. } => Some(text.as_str()),
                            _ => None,
                        }).collect::<Vec<_>>().join("");
                        if !text.is_empty() {
                            yield ChatStreamEvent::Reasoning(text);
                        }
                    }
                    Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::ReasoningDelta { reasoning, .. })) => {
                        if thinking_span.is_none() {
                            thinking_span = Some(tracing::info_span!("thinking"));
                        }
                        if !reasoning.is_empty() {
                            yield ChatStreamEvent::Reasoning(reasoning);
                        }
                    }
                    Ok(MultiTurnStreamItem::FinalResponse(final_resp)) => {
                        let usage = final_resp.usage();
                        tracing::info!(
                            input_tokens = usage.input_tokens,
                            output_tokens = usage.output_tokens,
                            "chat stream completed"
                        );
                        rate_limit.record_usage(usage.input_tokens, usage.output_tokens).await;
                        usage_recorded = true;
                        yield ChatStreamEvent::Usage {
                            input_tokens: usage.input_tokens,
                            output_tokens: usage.output_tokens,
                        };
                    }
                    Ok(_) => {}
                    Err(e) => {
                        if crate::models::error::is_prompt_cancelled(&e) {
                            paused_for_approval = true;
                            break;
                        }
                        let err = AiError::from(e);
                        if !pending_text.is_empty() {
                            let _ = conversation.append_message(ChatHistoryMessage::Assistant {
                                content: std::mem::take(&mut pending_text),
                            }).await;
                        }
                        if let Err(pe) = conversation.record_turn_error(&err).await {
                            tracing::warn!("Failed to persist turn error: {pe}");
                        }
                        error_yielded = true;
                        yield ChatStreamEvent::Error(err);
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

            let mut tool_requests = Vec::new();
            while let Ok(payload) = rx.try_recv() {
                tool_requests.push(payload);
            }

            if !usage_recorded && !error_yielded && !paused_for_approval && tool_requests.is_empty() {
                tracing::error!("AI stream ended without final response, error, or pending approval");
                let err = AiError::ProviderUnavailable {
                    detail: "The model stream ended unexpectedly without completing the turn".to_string(),
                };
                if let Err(pe) = conversation.record_turn_error(&err).await {
                    tracing::warn!("Failed to persist turn error: {pe}");
                }
                yield ChatStreamEvent::Error(err);
            }

            for payload in tool_requests {
                match serde_json::from_str(&payload.args) {
                    Ok(args) => {
                        yield ChatStreamEvent::ToolRequest {
                            tool_call_id: payload.tool_call_id,
                            name: payload.name,
                            args,
                        };
                    }
                    Err(e) => {
                        yield ChatStreamEvent::Error(AiError::unknown(format!(
                            "Failed to parse tool arguments for {}: {e}", payload.name
                        )));
                    }
                }
            }
        })
    }

    async fn clear_turn_error_marker(&self) {
        if let Err(e) = self.conversation.clear_turn_error().await {
            tracing::warn!("Failed to clear turn error marker: {e}");
        }
    }

    async fn load_history_and_images(
        &self,
    ) -> Result<(Vec<HistoryEntry>, HashMap<Uuid, Base64Attachment>), AiError> {
        let history_entries = self
            .conversation
            .load_history()
            .await
            .map_err(|e| AiError::unknown(format!("{e:#}")))?;

        let ids: Vec<Uuid> = history_entries
            .iter()
            .flat_map(|e| e.file_ids.iter().copied())
            .collect();
        let images = self.resolve_attachments(&ids).await?;
        let images_by_id: HashMap<Uuid, Base64Attachment> = ids.into_iter().zip(images).collect();

        Ok((history_entries, images_by_id))
    }

    async fn resolve_attachments(&self, ids: &[Uuid]) -> Result<Vec<Base64Attachment>, AiError> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        self.conversation
            .fetch_attachments(ids)
            .await
            .map_err(|e| AiError::InvalidAttachment {
                detail: format!("{e:#}"),
            })
    }

    async fn prepare_new(
        &self,
        message: String,
        file_ids: Vec<Uuid>,
        skip_record: bool,
    ) -> Result<PreparedTurn, AiError> {
        let (history_entries, images_by_id) = self.load_history_and_images().await?;
        let current_images = self.resolve_attachments(&file_ids).await?;

        let history_messages: Vec<ChatHistoryMessage> =
            history_entries.iter().map(|e| e.message.clone()).collect();
        self.rate_limit
            .pre_check(&message, &current_images, &history_messages)
            .await?;

        if !skip_record {
            if let Err(e) = self
                .conversation
                .record_user_message(message.clone(), &file_ids)
                .await
            {
                self.rate_limit.release().await;
                return Err(AiError::unknown(format!("{e:#}")));
            }
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

    async fn prepare_continuation(&self) -> Result<PreparedTurn, AiError> {
        let (history_entries, images_by_id) = self.load_history_and_images().await?;

        let last_history_message = history_entries.last().map(|e| e.message.clone());
        let mut rig_history = build_rig_history(&history_entries, &images_by_id);
        let (current_message, synthetic) =
            continuation_prompt(last_history_message.as_ref(), &mut rig_history)?;
        if let Some(synthetic) = synthetic {
            self.conversation
                .append_message(synthetic)
                .await
                .map_err(|e| AiError::unknown(format!("{e:#}")))?;
        }

        // Rate-limit on the user content being replayed. When the replayed turn
        // is a user message, attribute it to the current turn (not history) so
        // it isn't double-counted; a resumed tool/approval turn adds no new
        // user input.
        let (current_text, current_images, prior_messages): (
            String,
            Vec<Base64Attachment>,
            Vec<ChatHistoryMessage>,
        ) = match history_entries.split_last() {
            Some((last, prior)) if matches!(last.message, ChatHistoryMessage::User { .. }) => {
                let ChatHistoryMessage::User { content } = &last.message else {
                    unreachable!("matched a user message above")
                };
                let imgs = last
                    .file_ids
                    .iter()
                    .filter_map(|id| images_by_id.get(id).cloned())
                    .collect();
                let prior_msgs = prior.iter().map(|e| e.message.clone()).collect();
                (content.clone(), imgs, prior_msgs)
            }
            _ => {
                let all = history_entries.iter().map(|e| e.message.clone()).collect();
                (String::new(), Vec::new(), all)
            }
        };
        self.rate_limit
            .pre_check(&current_text, &current_images, &prior_messages)
            .await?;

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
    images_by_id: HashMap<Uuid, Base64Attachment>,
}

fn continuation_prompt(
    last_history: Option<&ChatHistoryMessage>,
    rig_history: &mut Vec<Message>,
) -> Result<(Message, Option<ChatHistoryMessage>), AiError> {
    let mut synthetic = None;
    if let Some(ChatHistoryMessage::AssistantToolCall { tool_call_id, .. }) = last_history {
        let msg = ChatHistoryMessage::ToolResult {
            tool_call_id: tool_call_id.clone(),
            content: "Tool execution was interrupted before completing.".to_string(),
        };
        rig_history.push(msg.clone().into());
        synthetic = Some(msg);
    }
    match rig_history.pop() {
        Some(msg @ Message::User { .. }) => Ok((msg, synthetic)),
        _ => Err(AiError::Fatal {
            detail: "Conversation has no interrupted turn to continue".to_string(),
        }),
    }
}

fn build_user_message(text: &str, attachments: &[Base64Attachment]) -> Message {
    if attachments.is_empty() {
        return Message::user(text);
    }

    let mut contents: Vec<UserContent> = vec![UserContent::text(text)];
    for att in attachments {
        match attachment_to_user_content(att) {
            Some(uc) => contents.push(uc),
            None => tracing::warn!(
                media_type = %att.media_type,
                "Skipping unsupported attachment"
            ),
        }
    }
    Message::User {
        content: OneOrMany::many(contents)
            .unwrap_or_else(|_| OneOrMany::one(UserContent::text(text))),
    }
}

/// Gemini expects parallel tool calls and their results grouped as a single
/// model turn followed by a single tool-result turn. Persisted history stores
/// each call/result as its own row, so merge adjacent same-kind messages back
/// into that shape before sending.
fn coalesce_tool_messages(messages: Vec<Message>) -> Vec<Message> {
    let mut out: Vec<Message> = Vec::with_capacity(messages.len());
    for msg in messages {
        let merged = match (out.last_mut(), &msg) {
            (
                Some(Message::Assistant { content: prev, .. }),
                Message::Assistant { content: cur, .. },
            ) if is_all_tool_calls(prev) && is_all_tool_calls(cur) => {
                cur.iter().for_each(|item| prev.push(item.clone()));
                true
            }
            (Some(Message::User { content: prev }), Message::User { content: cur })
                if is_all_tool_results(prev) && is_all_tool_results(cur) =>
            {
                cur.iter().for_each(|item| prev.push(item.clone()));
                true
            }
            _ => false,
        };
        if !merged {
            out.push(msg);
        }
    }
    out
}

fn is_all_tool_calls(content: &OneOrMany<AssistantContent>) -> bool {
    content
        .iter()
        .all(|c| matches!(c, AssistantContent::ToolCall(_)))
}

fn is_all_tool_results(content: &OneOrMany<UserContent>) -> bool {
    content
        .iter()
        .all(|c| matches!(c, UserContent::ToolResult(_)))
}

fn build_rig_history(
    entries: &[HistoryEntry],
    images_by_id: &HashMap<Uuid, Base64Attachment>,
) -> Vec<Message> {
    let mut out = Vec::with_capacity(entries.len());
    for entry in entries {
        match &entry.message {
            ChatHistoryMessage::User { content } if !entry.file_ids.is_empty() => {
                let imgs: Vec<Base64Attachment> = entry
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

fn messages_to_persist(
    response_messages: Vec<Message>,
    history_len: usize,
) -> Vec<ChatHistoryMessage> {
    let new_messages: Vec<Message> = response_messages
        .into_iter()
        .skip(history_len + 1)
        .collect();
    convert_messages_to_history(new_messages)
        .into_iter()
        .filter(|msg| {
            !matches!(
                msg,
                ChatHistoryMessage::User { .. } | ChatHistoryMessage::ToolApproval { .. }
            )
        })
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::chat::ChatHistoryMessage;
    use rig::completion::message::{ToolCall, ToolFunction};

    fn rig_history_from(messages: &[ChatHistoryMessage]) -> Vec<Message> {
        messages.iter().cloned().map(Into::into).collect()
    }

    #[test]
    fn continuation_after_tool_result_pops_it_as_prompt() {
        let history = vec![
            ChatHistoryMessage::User {
                content: "hi".into(),
            },
            ChatHistoryMessage::ToolResult {
                tool_call_id: "c1".into(),
                content: "result".into(),
            },
        ];
        let mut rig = rig_history_from(&history);
        let (prompt, synthetic) = continuation_prompt(history.last(), &mut rig).unwrap();
        let Message::User { content } = &prompt else {
            panic!("expected user prompt");
        };
        assert!(content
            .iter()
            .any(|c| matches!(c, UserContent::ToolResult(tr) if tr.id == "c1")));
        assert!(synthetic.is_none());
        assert_eq!(rig.len(), 1);
    }

    #[test]
    fn continuation_after_dangling_tool_call_synthesizes_result() {
        let history = vec![
            ChatHistoryMessage::User {
                content: "hi".into(),
            },
            ChatHistoryMessage::AssistantToolCall {
                tool_call_id: "c1".into(),
                name: "search".into(),
                args: "{}".into(),
                signature: None,
            },
        ];
        let mut rig = rig_history_from(&history);
        let (prompt, synthetic) = continuation_prompt(history.last(), &mut rig).unwrap();
        let Message::User { content } = &prompt else {
            panic!("expected user prompt");
        };
        assert!(content
            .iter()
            .any(|c| matches!(c, UserContent::ToolResult(tr) if tr.id == "c1")));
        assert_eq!(rig.len(), 2);
        let Some(ChatHistoryMessage::ToolResult { tool_call_id, .. }) = synthetic else {
            panic!("expected synthetic tool result");
        };
        assert_eq!(tool_call_id, "c1");
    }

    #[test]
    fn continuation_after_bare_user_message_reuses_it() {
        let history = vec![ChatHistoryMessage::User {
            content: "hi".into(),
        }];
        let mut rig = rig_history_from(&history);
        let (prompt, synthetic) = continuation_prompt(history.last(), &mut rig).unwrap();
        assert!(matches!(prompt, Message::User { .. }));
        assert!(synthetic.is_none());
        assert!(rig.is_empty());
    }

    #[test]
    fn continuation_after_final_assistant_text_is_rejected() {
        let history = vec![
            ChatHistoryMessage::User {
                content: "hi".into(),
            },
            ChatHistoryMessage::Assistant {
                content: "done".into(),
            },
        ];
        let mut rig = rig_history_from(&history);
        assert!(continuation_prompt(history.last(), &mut rig).is_err());
    }

    #[test]
    fn continuation_on_empty_history_is_rejected() {
        let mut rig = Vec::new();
        assert!(continuation_prompt(None, &mut rig).is_err());
    }

    #[test]
    fn persist_excludes_fed_history_and_prompt() {
        // A correction turn: rig is fed the prior turn's history, then the
        // correction prompt, and returns `[history..., prompt, new turn...]`.
        // Only the new turn's messages must be persisted — re-persisting the
        // history is what bloated conversations on every correction.
        let prior = vec![
            ChatHistoryMessage::User {
                content: "analyze receipt".into(),
            },
            ChatHistoryMessage::AssistantToolCall {
                tool_call_id: "t1".into(),
                name: "search".into(),
                args: "{}".into(),
                signature: None,
            },
            ChatHistoryMessage::ToolResult {
                tool_call_id: "t1".into(),
                content: "[]".into(),
            },
            ChatHistoryMessage::Assistant {
                content: "proposal v1".into(),
            },
        ];
        let fed_history = rig_history_from(&prior);
        let history_len = fed_history.len();

        let prompt: Message = ChatHistoryMessage::User {
            content: "make this a group".into(),
        }
        .into();

        let new_turn = vec![
            ChatHistoryMessage::AssistantToolCall {
                tool_call_id: "t2".into(),
                name: "search".into(),
                args: "{}".into(),
                signature: None,
            },
            ChatHistoryMessage::ToolResult {
                tool_call_id: "t2".into(),
                content: "[]".into(),
            },
            ChatHistoryMessage::Assistant {
                content: "proposal v2".into(),
            },
        ];

        let mut response_messages = fed_history.clone();
        response_messages.push(prompt);
        response_messages.extend(rig_history_from(&new_turn));

        let persisted = messages_to_persist(response_messages, history_len);

        assert_eq!(persisted.len(), 3, "only the new turn should be persisted");
        assert!(matches!(
            &persisted[0],
            ChatHistoryMessage::AssistantToolCall { tool_call_id, .. } if tool_call_id == "t2"
        ));
        assert!(matches!(
            &persisted[1],
            ChatHistoryMessage::ToolResult { tool_call_id, .. } if tool_call_id == "t2"
        ));
        assert!(matches!(
            &persisted[2],
            ChatHistoryMessage::Assistant { content } if content == "proposal v2"
        ));
        // The prior turn's messages and the prompt must not be re-persisted.
        assert!(!persisted.iter().any(
            |m| matches!(m, ChatHistoryMessage::Assistant { content } if content == "proposal v1")
        ));
        assert!(!persisted
            .iter()
            .any(|m| matches!(m, ChatHistoryMessage::AssistantToolCall { tool_call_id, .. } if tool_call_id == "t1")));
    }

    #[test]
    fn persist_excludes_replayed_tool_result_prompt_on_continuation() {
        // Resuming an interrupted turn: `continuation_prompt` pops the trailing
        // tool result to use as the prompt. That prompt converts to a
        // `ToolResult` (not `User`), so it must be excluded by position — the
        // role filter alone would re-persist it.
        let history = vec![
            ChatHistoryMessage::User {
                content: "hi".into(),
            },
            ChatHistoryMessage::ToolResult {
                tool_call_id: "c1".into(),
                content: "interrupted result".into(),
            },
        ];
        let mut rig_history = rig_history_from(&history);
        let (prompt, synthetic) = continuation_prompt(history.last(), &mut rig_history).unwrap();
        assert!(synthetic.is_none());
        let history_len = rig_history.len();

        let new_turn = vec![ChatHistoryMessage::Assistant {
            content: "final answer".into(),
        }];
        let mut response_messages = rig_history.clone();
        response_messages.push(prompt);
        response_messages.extend(rig_history_from(&new_turn));

        let persisted = messages_to_persist(response_messages, history_len);

        assert_eq!(persisted.len(), 1);
        assert!(matches!(
            &persisted[0],
            ChatHistoryMessage::Assistant { content } if content == "final answer"
        ));
        assert!(
            !persisted
                .iter()
                .any(|m| matches!(m, ChatHistoryMessage::ToolResult { .. })),
            "the replayed tool result used as the prompt must not be persisted again"
        );
    }

    fn asst_call(id: &str) -> Message {
        Message::Assistant {
            id: None,
            content: OneOrMany::one(AssistantContent::ToolCall(ToolCall::new(
                id.to_string(),
                ToolFunction::new("record_asset_trade".to_string(), serde_json::json!({})),
            ))),
        }
    }

    fn tool_result(id: &str) -> Message {
        Message::User {
            content: OneOrMany::one(UserContent::tool_result(
                id.to_string(),
                OneOrMany::one(ToolResultContent::text("ok")),
            )),
        }
    }

    fn tool_call_count(msg: &Message) -> usize {
        match msg {
            Message::Assistant { content, .. } => content.iter().count(),
            Message::User { content } => content.iter().count(),
        }
    }

    #[test]
    fn merges_parallel_calls_and_their_results() {
        let out = coalesce_tool_messages(vec![
            asst_call("a"),
            asst_call("b"),
            tool_result("a"),
            tool_result("b"),
        ]);

        assert_eq!(out.len(), 2);
        assert!(matches!(out[0], Message::Assistant { .. }));
        assert_eq!(tool_call_count(&out[0]), 2);
        assert!(matches!(out[1], Message::User { .. }));
        assert_eq!(tool_call_count(&out[1]), 2);
    }

    #[test]
    fn leaves_alternating_pairs_untouched() {
        let out = coalesce_tool_messages(vec![
            asst_call("a"),
            tool_result("a"),
            asst_call("b"),
            tool_result("b"),
        ]);

        assert_eq!(out.len(), 4);
    }

    #[test]
    fn does_not_merge_across_a_text_message() {
        let out = coalesce_tool_messages(vec![
            asst_call("a"),
            Message::user("hello"),
            asst_call("b"),
        ]);

        assert_eq!(out.len(), 3);
    }
}
