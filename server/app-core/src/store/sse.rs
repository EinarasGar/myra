use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use futures_util::StreamExt;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

use crate::models::ChatStreamEvent;

#[derive(Debug, Clone)]
pub enum SseEvent {
    State { step: String },
    Proposal,
    Error { message: String },
    Done,
}

pub async fn subscribe_sse(
    http: &reqwest::Client,
    base_url: &str,
    user_id: &str,
    upload_id: &str,
    auth_token: Option<&str>,
) -> tokio::sync::mpsc::Receiver<SseEvent> {
    let (tx, rx) = tokio::sync::mpsc::channel(32);

    let url = format!(
        "{}/api/users/{}/ai/quick-upload/{}/subscribe",
        base_url, user_id, upload_id
    );

    let mut builder = http.get(&url).header("Accept", "text/event-stream");
    if let Some(token) = auth_token {
        builder = builder.bearer_auth(token);
    }

    let response = match builder.send().await {
        Ok(resp) => resp,
        Err(e) => {
            let tx_err = tx.clone();
            tokio::spawn(async move {
                let _ = tx_err
                    .send(SseEvent::Error {
                        message: format!("SSE connection failed: {e}"),
                    })
                    .await;
            });
            return rx;
        }
    };

    tokio::spawn(async move {
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut pending: Vec<u8> = Vec::new();

        while let Some(chunk) = stream.next().await {
            let bytes = match chunk {
                Ok(b) => b,
                Err(e) => {
                    let _ = tx
                        .send(SseEvent::Error {
                            message: format!("Stream error: {e}"),
                        })
                        .await;
                    break;
                }
            };

            drain_utf8(&mut pending, &bytes, &mut buffer);

            // Process complete events (terminated by double newline)
            while let Some(pos) = buffer.find("\n\n") {
                let event_block = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();

                let (event_type, data) = parse_sse_block(&event_block);

                let sse_event = match event_type.as_str() {
                    "state" => {
                        let step = serde_json::from_str::<serde_json::Value>(&data)
                            .ok()
                            .and_then(|v| v["step"].as_str().map(|s| s.to_string()))
                            .unwrap_or(data);
                        SseEvent::State { step }
                    }
                    "proposal" => SseEvent::Proposal,
                    "error" => {
                        let message = serde_json::from_str::<serde_json::Value>(&data)
                            .ok()
                            .and_then(|v| v["message"].as_str().map(|s| s.to_string()))
                            .unwrap_or(data);
                        SseEvent::Error { message }
                    }
                    "done" => SseEvent::Done,
                    _ => continue,
                };

                let is_terminal = matches!(
                    sse_event,
                    SseEvent::Proposal | SseEvent::Error { .. } | SseEvent::Done
                );
                let _ = tx.send(sse_event).await;
                if is_terminal {
                    return;
                }
            }
        }
    });

    rx
}

// ── Error envelope handling ──────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct ErrorEnvelope {
    #[serde(default)]
    error_type: Option<String>,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    details: Option<RateLimitDetails>,
}

#[derive(serde::Deserialize)]
struct RateLimitDetails {
    #[serde(default)]
    reason: Option<String>,
    #[serde(default)]
    scope: Option<String>,
    #[serde(default)]
    reset_at: Option<String>,
}

/// Map a non-2xx response from the standardized error envelope into a chat event. Rate limits
/// (HTTP 429 / `error_type: RateLimited`) become a friendly [`ChatStreamEvent::RateLimited`];
/// anything else surfaces the envelope's message.
fn classify_error_response(status: u16, body: &str) -> ChatStreamEvent {
    let envelope: Option<ErrorEnvelope> = serde_json::from_str(body).ok();

    let is_rate_limited = status == 429
        || envelope.as_ref().and_then(|e| e.error_type.as_deref()) == Some("RateLimited");

    if is_rate_limited {
        let details = envelope.as_ref().and_then(|e| e.details.as_ref());
        let reason = details.and_then(|d| d.reason.as_deref()).unwrap_or("");
        let scope = details.and_then(|d| d.scope.as_deref()).unwrap_or("");
        let reset_at = details.and_then(|d| d.reset_at.as_deref());

        let message = match reason {
            "per_request_input_limit" => {
                "That message is too large to process. Try a shorter message or a smaller image."
            }
            "concurrency_limit" => {
                "Please wait for the current response to finish before sending another message."
            }
            "quota_exceeded" if scope == "global" => {
                "The assistant is temporarily over capacity. Please try again shortly."
            }
            _ => "You've reached your usage limit for the assistant.",
        }
        .to_string();

        let retry_after_seconds = reset_at.and_then(retry_after_from_rfc3339);

        return ChatStreamEvent::RateLimited {
            message,
            retry_after_seconds,
        };
    }

    let message = envelope
        .and_then(|e| e.message)
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| format!("Request failed (HTTP {status})"));
    ChatStreamEvent::Error { message }
}

fn retry_after_from_rfc3339(reset_at: &str) -> Option<i64> {
    let reset = OffsetDateTime::parse(reset_at, &Rfc3339).ok()?;
    Some((reset - OffsetDateTime::now_utc()).whole_seconds().max(0))
}

/// Append `bytes` to `pending`, decode the longest valid UTF-8 prefix into `out`, and keep any
/// trailing incomplete multibyte sequence in `pending` for the next chunk. Decoding each network
/// chunk in isolation would drop a character split across a chunk boundary, corrupting the stream.
fn drain_utf8(pending: &mut Vec<u8>, bytes: &[u8], out: &mut String) {
    pending.extend_from_slice(bytes);
    let valid_up_to = match std::str::from_utf8(pending) {
        Ok(s) => s.len(),
        Err(e) => e.valid_up_to(),
    };
    if valid_up_to > 0 {
        out.push_str(std::str::from_utf8(&pending[..valid_up_to]).unwrap());
        pending.drain(..valid_up_to);
    }
}

fn parse_sse_block(block: &str) -> (String, String) {
    let mut event_type = String::from("message");
    let mut data_lines: Vec<&str> = Vec::new();

    for line in block.lines() {
        if let Some(value) = line.strip_prefix("event:") {
            event_type = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("data:") {
            data_lines.push(value.trim_start_matches(' '));
        }
    }

    (event_type, data_lines.join("\n"))
}


pub async fn subscribe_chat_sse(
    http: &reqwest::Client,
    base_url: &str,
    user_id: &str,
    conversation_id: &str,
    body: serde_json::Value,
    auth_token: Option<&str>,
    cancelled: Arc<AtomicBool>,
) -> tokio::sync::mpsc::Receiver<ChatStreamEvent> {
    let (tx, rx) = tokio::sync::mpsc::channel(64);

    let url = format!(
        "{}/api/users/{}/ai/conversations/{}/messages",
        base_url, user_id, conversation_id
    );

    let body_str = match serde_json::to_string(&body) {
        Ok(s) => s,
        Err(e) => {
            let tx_err = tx.clone();
            tokio::spawn(async move {
                let _ = tx_err
                    .send(ChatStreamEvent::Error {
                        message: format!("JSON serialization error: {e}"),
                    })
                    .await;
            });
            return rx;
        }
    };

    let mut builder = http
        .post(&url)
        .header("Accept", "text/event-stream")
        .header("Content-Type", "application/json")
        .body(body_str);

    if let Some(token) = auth_token {
        builder = builder.bearer_auth(token);
    }

    let response = match builder.send().await {
        Ok(resp) => {
            if !resp.status().is_success() {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                let event = classify_error_response(status.as_u16(), &body);
                let tx_err = tx.clone();
                tokio::spawn(async move {
                    let _ = tx_err.send(event).await;
                });
                return rx;
            }
            resp
        }
        Err(e) => {
            let tx_err = tx.clone();
            tokio::spawn(async move {
                let _ = tx_err
                    .send(ChatStreamEvent::Error {
                        message: format!("SSE connection failed: {e}"),
                    })
                    .await;
            });
            return rx;
        }
    };

    tokio::spawn(async move {
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut pending: Vec<u8> = Vec::new();

        while let Some(chunk) = stream.next().await {
            if cancelled.load(std::sync::atomic::Ordering::Relaxed) {
                break;
            }

            let bytes = match chunk {
                Ok(b) => b,
                Err(e) => {
                    tracing::error!("chat SSE stream error: {e}");
                    let _ = tx
                        .send(ChatStreamEvent::Error {
                            message: format!("Stream error: {e}"),
                        })
                        .await;
                    break;
                }
            };

            drain_utf8(&mut pending, &bytes, &mut buffer);

            while let Some(pos) = buffer.find("\n\n") {
                let event_block = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();

                let (event_type, data) = parse_sse_block(&event_block);

                let event = match event_type.as_str() {
                    "text" => ChatStreamEvent::TextDelta { delta: data },
                    "tool_call" => {
                        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&data);
                        match parsed {
                            Ok(v) => ChatStreamEvent::ToolCall {
                                call_id: v["call_id"].as_str().unwrap_or("").to_string(),
                                name: v["name"].as_str().unwrap_or("").to_string(),
                                params: v["input"].to_string(),
                            },
                            Err(_) => continue,
                        }
                    }
                    "tool_result" => {
                        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&data);
                        match parsed {
                            Ok(v) => ChatStreamEvent::ToolResult {
                                name: v["name"].as_str().unwrap_or("").to_string(),
                                output: v["output"].to_string(),
                            },
                            Err(_) => continue,
                        }
                    }
                    "tool_request" => {
                        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&data);
                        match parsed {
                            Ok(v) => ChatStreamEvent::ToolApprovalRequired {
                                call_id: v["tool_call_id"].as_str().unwrap_or("").to_string(),
                                name: v["name"].as_str().unwrap_or("").to_string(),
                                params: v["args"].to_string(),
                            },
                            Err(_) => continue,
                        }
                    }
                    "reasoning" => ChatStreamEvent::ReasoningDelta { delta: data },
                    "error" => ChatStreamEvent::Error { message: data },
                    "done" => {
                        let _ = tx.send(ChatStreamEvent::Done).await;
                        return;
                    }
                    _ => continue,
                };

                let is_terminal = matches!(
                    event,
                    ChatStreamEvent::ToolApprovalRequired { .. }
                        | ChatStreamEvent::Error { .. }
                        | ChatStreamEvent::Done
                );

                let _ = tx.send(event).await;
                if is_terminal {
                    return;
                }
            }
        }
    });

    rx
}
