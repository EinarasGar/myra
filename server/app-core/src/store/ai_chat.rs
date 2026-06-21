use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;

use crate::error::ApiError;
use crate::models::{ChatMessage, ChatStreamEvent, ConversationItem, MessagePart};
use crate::store::infra::SharedInfra;

#[uniffi::export(callback_interface)]
pub trait AiChatObserver: Send + Sync {
    fn on_conversations_changed(&self, conversations: Vec<ConversationItem>);
    fn on_messages_changed(&self, conversation_id: String, messages: Vec<ChatMessage>);
    fn on_stream_event(&self, conversation_id: String, event: ChatStreamEvent);
}

pub struct AiChatModule {
    pub conversations: Vec<ConversationItem>,
    pub active_conversation_id: Option<String>,
    pub messages: Vec<ChatMessage>,
    pub is_streaming: bool,
    pub observer: Option<Box<dyn AiChatObserver>>,
    pub pending_approval: Option<(String, String)>,
    pub cancelled: Option<Arc<AtomicBool>>,
}

impl Default for AiChatModule {
    fn default() -> Self {
        Self::new()
    }
}

impl AiChatModule {
    pub fn new() -> Self {
        Self {
            conversations: vec![],
            active_conversation_id: None,
            messages: vec![],
            is_streaming: false,
            observer: None,
            pending_approval: None,
            cancelled: None,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn AiChatObserver>) {
        self.observer = Some(observer);
        self.notify_conversations();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.conversations.clear();
        self.active_conversation_id = None;
        self.messages.clear();
        self.is_streaming = false;
        self.notify_conversations();
        self.pending_approval = None;
        if let Some(ref c) = self.cancelled {
            c.store(true, Ordering::Relaxed);
        }
        self.cancelled = None;
    }

    fn notify_conversations(&self) {
        if let Some(obs) = &self.observer {
            obs.on_conversations_changed(self.conversations.clone());
        }
    }

    fn notify_messages(&self) {
        if let Some(obs) = &self.observer {
            if let Some(cid) = &self.active_conversation_id {
                obs.on_messages_changed(cid.clone(), self.messages.clone());
            }
        }
    }

    fn notify_stream_event(&self, event: ChatStreamEvent) {
        if let Some(obs) = &self.observer {
            if let Some(cid) = &self.active_conversation_id {
                obs.on_stream_event(cid.clone(), event);
            }
        }
    }

    pub fn mark_streaming(&mut self) {
        self.is_streaming = true;
    }

    pub fn clear_streaming(&mut self) {
        self.is_streaming = false;
    }
}

// ── Server response types ──────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct ServerConversation {
    id: String,
    title: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(serde::Deserialize)]
struct ServerMessage {
    id: String,
    role: String,
    content: serde_json::Value,
    file_ids: Option<Vec<String>>,
    created_at: Option<String>,
}

#[derive(serde::Deserialize)]
struct ServerFileUrl {
    url: String,
    media_type: String,
}

#[derive(serde::Serialize)]
struct FileCreateBody {
    mime_type: String,
    original_name: String,
    size_bytes: u64,
}

#[derive(serde::Deserialize)]
struct ServerFileRecord {
    id: String,
    upload_metadata: UploadMetadata,
}

#[derive(serde::Deserialize)]
struct UploadMetadata {
    upload_url: String,
    upload_headers: std::collections::HashMap<String, String>,
    upload_method: String,
}

// ── Public functions ────────────────────────────────────────────────────────

pub async fn load_conversations(
    infra: &Arc<SharedInfra>,
    module: &Mutex<AiChatModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    let path = format!("/api/users/{}/ai/conversations", user_id);
    // Always refresh from the server — this is the explicit "reload the list" call (init, after
    // create/delete), so bypass the TTL memory cache which would otherwise return a stale list
    // (e.g. still showing a just-deleted conversation until the app restarts).
    infra.evict_memory_cache(&path);
    let result = infra.get(&path, auth_token).await;

    match result {
        Ok(resp) => {
            if let Ok(convs) = serde_json::from_str::<Vec<ServerConversation>>(&resp.body) {
                let items: Vec<ConversationItem> = convs
                    .into_iter()
                    .map(|c| ConversationItem {
                        id: c.id,
                        title: c.title.unwrap_or_else(|| "New conversation".to_string()),
                        created_at: c.created_at,
                        updated_at: c.updated_at,
                    })
                    .collect();
                let mut lock = module.lock().unwrap();
                lock.conversations = items;
                lock.notify_conversations();
            }
        }
        Err(_) => { /* network error — keep existing list */ }
    }
}

pub async fn create_conversation(
    infra: &Arc<SharedInfra>,
    module: &Mutex<AiChatModule>,
    auth_token: Option<&str>,
) -> Result<String, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let path = format!("/api/users/{}/ai/conversations", user_id);
    let resp = infra.post(&path, "", auth_token).await?;
    let created: ServerConversation =
        serde_json::from_str(&resp.body).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;
    load_conversations(infra, module, auth_token).await;
    Ok(created.id)
}

pub async fn delete_conversation(
    infra: &Arc<SharedInfra>,
    module: &Mutex<AiChatModule>,
    id: &str,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let path = format!("/api/users/{}/ai/conversations/{}", user_id, id);
    infra.delete(&path, auth_token).await?;

    load_conversations(infra, module, auth_token).await;

    Ok(())
}

pub async fn load_messages(
    infra: &Arc<SharedInfra>,
    module: &Mutex<AiChatModule>,
    conversation_id: &str,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    let path = format!(
        "/api/users/{}/ai/conversations/{}/messages",
        user_id, conversation_id
    );
    let result = infra.get(&path, auth_token).await;

    match result {
        Ok(resp) => {
            if let Ok(server_msgs) = serde_json::from_str::<Vec<ServerMessage>>(&resp.body) {
                let mut all_file_ids: Vec<String> = vec![];
                for m in &server_msgs {
                    if let Some(ids) = &m.file_ids {
                        for fid in ids {
                            if !all_file_ids.contains(fid) {
                                all_file_ids.push(fid.clone());
                            }
                        }
                    }
                }

                // fid -> (url, media_type). Fetch the presigned URLs concurrently — each is an
                // independent round-trip and a conversation can carry several attachments.
                let user_id = user_id.as_str();
                let url_fetches = all_file_ids.iter().map(|fid| async move {
                    let url_path = format!("/api/users/{}/files/{}/url", user_id, fid);
                    let url_resp = infra.get(&url_path, auth_token).await.ok()?;
                    let server_url = serde_json::from_str::<ServerFileUrl>(&url_resp.body).ok()?;
                    Some((fid.clone(), (server_url.url, server_url.media_type)))
                });
                let file_urls: std::collections::HashMap<String, (String, String)> =
                    futures_util::future::join_all(url_fetches)
                        .await
                        .into_iter()
                        .flatten()
                        .collect();

                let mut completed_call_ids: HashSet<String> = HashSet::new();
                for m in &server_msgs {
                    if m.role == "tool_result" {
                        if let Some(tc) = m.content.as_object() {
                            if let Some(cid) = tc.get("tool_call_id").and_then(|v| v.as_str()) {
                                completed_call_ids.insert(cid.to_string());
                            }
                        }
                    }
                }

                let mut merged: Vec<ChatMessage> = vec![];
                for m in &server_msgs {
                    if m.role == "tool_result" || m.role == "tool_approval" {
                        continue;
                    }
                    let role = if m.role == "user" {
                        "user"
                    } else {
                        "assistant"
                    };
                    let parts = server_content_to_parts(&m.content, &completed_call_ids);

                    if parts.is_empty() {
                        continue;
                    }

                    let mut all_parts: Vec<MessagePart> = vec![];
                    if let Some(ids) = &m.file_ids {
                        for fid in ids {
                            if let Some((url, media_type)) = file_urls.get(fid) {
                                all_parts.push(MessagePart::File {
                                    file_id: fid.clone(),
                                    media_type: media_type.clone(),
                                    url: url.clone(),
                                });
                            }
                        }
                    }
                    all_parts.extend(parts);

                    let prev = merged.last();
                    let should_merge = prev.is_some_and(|p| p.role == role && role == "assistant");
                    if should_merge {
                        if let Some(last) = merged.last_mut() {
                            last.parts.extend(all_parts);
                        }
                    } else {
                        merged.push(ChatMessage {
                            role: role.to_string(),
                            parts: all_parts,
                        });
                    }
                }

                // A gated tool call awaiting approval pauses the stream and is persisted as a
                // trailing tool_call with no result. Restore its "approval-requested" state so the
                // approval card reappears on reload instead of showing a stuck "Running…".
                if let Some(last_msg) = merged.last_mut() {
                    if last_msg.role == "assistant" {
                        if let Some(MessagePart::ToolCall { state, output, .. }) =
                            last_msg.parts.last_mut()
                        {
                            if output.is_none() {
                                *state = "approval-requested".to_string();
                            }
                        }
                    }
                }

                let mut lock = module.lock().unwrap();
                lock.active_conversation_id = Some(conversation_id.to_string());
                lock.messages = merged;
                lock.notify_messages();
            }
        }
        Err(_) => { /* network error */ }
    }
}

fn server_content_to_parts(
    content: &serde_json::Value,
    completed_call_ids: &HashSet<String>,
) -> Vec<MessagePart> {
    let mut parts: Vec<MessagePart> = vec![];

    match content {
        serde_json::Value::Array(arr) => {
            for item in arr {
                if let Some(obj) = item.as_object() {
                    let item_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("");
                    match item_type {
                        "text" => {
                            if let Some(text) = obj.get("text").and_then(|v| v.as_str()) {
                                parts.push(MessagePart::Text {
                                    content: text.to_string(),
                                });
                            }
                        }
                        "reasoning" => {
                            if let Some(text) = obj.get("text").and_then(|v| v.as_str()) {
                                parts.push(MessagePart::Reasoning {
                                    content: text.to_string(),
                                });
                            }
                        }
                        "tool_call" => {
                            let call_id = obj
                                .get("tool_call_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let name = obj
                                .get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let params = obj
                                .get("args")
                                .map(|v| v.to_string())
                                .unwrap_or_else(|| "{}".to_string());
                            let state = if completed_call_ids.contains(&call_id) {
                                "output-available"
                            } else {
                                "input-available"
                            };
                            parts.push(MessagePart::ToolCall {
                                call_id,
                                name,
                                params,
                                state: state.to_string(),
                                output: None,
                            });
                        }
                        _ => {}
                    }
                }
            }
        }
        serde_json::Value::Object(obj) => {
            // Stored history rows are a single ChatHistoryMessageDto object:
            // {"type":"user"|"assistant","content":"..."} or
            // {"type":"assistant_tool_call","tool_call_id":..,"name":..,"args":".."}.
            let item_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("");
            match item_type {
                "user" | "assistant" => {
                    if let Some(text) = obj.get("content").and_then(|v| v.as_str()) {
                        if !text.is_empty() {
                            parts.push(MessagePart::Text {
                                content: text.to_string(),
                            });
                        }
                    }
                }
                "assistant_tool_call" => {
                    let call_id = obj
                        .get("tool_call_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let name = obj
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let params = obj
                        .get("args")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| "{}".to_string());
                    let state = if completed_call_ids.contains(&call_id) {
                        "output-available"
                    } else {
                        "input-available"
                    };
                    parts.push(MessagePart::ToolCall {
                        call_id,
                        name,
                        params,
                        state: state.to_string(),
                        output: None,
                    });
                }
                _ => {}
            }
        }
        serde_json::Value::String(s) => {
            parts.push(MessagePart::Text { content: s.clone() });
        }
        _ => {}
    }

    let mut merged: Vec<MessagePart> = vec![];
    for part in parts {
        let should_merge = matches!(
            (&part, merged.last()),
            (MessagePart::Text { .. }, Some(MessagePart::Text { .. }))
                | (
                    MessagePart::Reasoning { .. },
                    Some(MessagePart::Reasoning { .. })
                )
        );
        if should_merge {
            if let Some(last) = merged.last_mut() {
                match (last, &part) {
                    (MessagePart::Text { content: c1 }, MessagePart::Text { content: c2 }) => {
                        c1.push_str(c2);
                    }
                    (
                        MessagePart::Reasoning { content: c1 },
                        MessagePart::Reasoning { content: c2 },
                    ) => {
                        c1.push_str(c2);
                    }
                    _ => {}
                }
            }
        } else {
            merged.push(part);
        }
    }

    merged
}

pub async fn upload_file(
    infra: &Arc<SharedInfra>,
    user_id: &str,
    image_data: &[u8],
    mime_type: &str,
    file_name: &str,
    auth_token: Option<&str>,
) -> Result<String, ApiError> {
    let create_path = format!("/api/users/{}/files", user_id);
    let create_body = serde_json::to_string(&FileCreateBody {
        mime_type: mime_type.to_string(),
        original_name: file_name.to_string(),
        size_bytes: image_data.len() as u64,
    })
    .map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })?;

    let create_resp = infra.post(&create_path, &create_body, auth_token).await?;
    let file_record: ServerFileRecord =
        serde_json::from_str(&create_resp.body).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

    let method = reqwest::Method::from_bytes(file_record.upload_metadata.upload_method.as_bytes())
        .unwrap_or(reqwest::Method::PUT);

    let mut upload_req = infra
        .http
        .request(method, &file_record.upload_metadata.upload_url);

    for (key, value) in &file_record.upload_metadata.upload_headers {
        upload_req = upload_req.header(key, value);
    }

    let upload_resp = upload_req
        .body(image_data.to_vec())
        .send()
        .await
        .map_err(|e| ApiError::Network {
            reason: e.to_string(),
        })?;

    if !upload_resp.status().is_success() {
        return Err(ApiError::Server {
            reason: format!("S3 upload failed: {}", upload_resp.status()),
            status: upload_resp.status().as_u16(),
        });
    }

    let confirm_path = format!("/api/users/{}/files/{}/confirm", user_id, file_record.id);
    infra.post(&confirm_path, "{}", auth_token).await?;

    Ok(file_record.id)
}
// ── Streaming & tool approval ───────────────────────────────────────────────

use crate::store::sse;

pub async fn send_message(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<AiChatModule>>,
    conversation_id: &str,
    text: &str,
    file_ids: &[String],
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    {
        let mut lock = module.lock().unwrap();
        lock.active_conversation_id = Some(conversation_id.to_string());
        lock.mark_streaming();
    }

    let body = serde_json::json!({
        "message": text,
        "file_ids": file_ids,
    });

    drive_chat_stream(infra, module, conversation_id, &user_id, body, auth_token).await;
}

pub async fn approve_tool(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<AiChatModule>>,
    conversation_id: &str,
    call_id: &str,
    approved: bool,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    let body = serde_json::json!({
        "tool_approvals": [{
            "tool_call_id": call_id,
            "approved": approved,
        }],
    });

    drive_chat_stream(infra, module, conversation_id, &user_id, body, auth_token).await;
}

/// Open the chat SSE stream for `body`, forward events to the client, and watch for terminals.
///
/// The client (on_stream_event -> applyStreamEvent) is the single builder of the live streaming
/// UI — both the initial reply and the post-approval continuation — so we only forward events
/// here. We deliberately do NOT reload from the server afterwards: that races with server-side
/// persistence and can briefly blank the thread. We just ensure the client leaves the streaming
/// state by emitting a terminal Done (the server may not send one if the stream just closes),
/// skipped while awaiting approval where streaming already stopped and the approval card must stay.
async fn drive_chat_stream(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<AiChatModule>>,
    conversation_id: &str,
    user_id: &str,
    body: serde_json::Value,
    auth_token: Option<&str>,
) {
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut lock = module.lock().unwrap();
        lock.cancelled = Some(cancelled.clone());
        lock.mark_streaming();
    }

    let mut rx = sse::subscribe_chat_sse(
        &infra.http_stream,
        &infra.base_url,
        user_id,
        conversation_id,
        body,
        auth_token,
        cancelled.clone(),
    )
    .await;

    let mut awaiting_approval = false;
    while let Some(event) = rx.recv().await {
        {
            let lock = module.lock().unwrap();
            lock.notify_stream_event(event.clone());
        }
        match event {
            ChatStreamEvent::ToolApprovalRequired { call_id, .. } => {
                let mut lock = module.lock().unwrap();
                lock.pending_approval = Some((conversation_id.to_string(), call_id));
                awaiting_approval = true;
                break;
            }
            ChatStreamEvent::Error { .. } | ChatStreamEvent::Done => break,
            _ => {}
        }
    }

    {
        let mut lock = module.lock().unwrap();
        lock.clear_streaming();
        lock.cancelled = None;
    }

    if !awaiting_approval {
        let lock = module.lock().unwrap();
        lock.notify_stream_event(ChatStreamEvent::Done);
    }
}

pub fn cancel_stream(module: &Arc<Mutex<AiChatModule>>) {
    let lock = module.lock().unwrap();
    if let Some(ref cancelled) = lock.cancelled {
        cancelled.store(true, Ordering::Relaxed);
    }
}
