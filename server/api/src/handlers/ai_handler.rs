use std::convert::Infallible;

use axum::{
    extract::Path,
    response::sse::{Event, KeepAlive, Sse},
    Json,
};
use business::dtos::ai_chat_dto::{Base64ImageDto, ChatHistoryMessageDto, ChatStreamEventDto};
use futures::{Stream, StreamExt};
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::AiChatServiceState,
    view_models::ai::chat::{ChatMessageViewModel, ChatRequestViewModel},
};

pub async fn chat(
    Path(user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    AiChatServiceState(service): AiChatServiceState,
    Json(request): Json<ChatRequestViewModel>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ApiError> {
    let images: Option<Vec<Base64ImageDto>> = if request.images.is_empty() {
        None
    } else {
        Some(
            request
                .images
                .iter()
                .map(|i| Base64ImageDto {
                    media_type: i.media_type.clone(),
                    data: i.data.clone(),
                })
                .collect(),
        )
    };

    let chat_history: Vec<ChatHistoryMessageDto> = request
        .history
        .into_iter()
        .map(|m| match m {
            ChatMessageViewModel::User { content } => ChatHistoryMessageDto::User { content },
            ChatMessageViewModel::Assistant { content } => {
                ChatHistoryMessageDto::Assistant { content }
            }
            ChatMessageViewModel::AssistantToolCall {
                tool_call_id,
                name,
                args,
                signature,
            } => ChatHistoryMessageDto::AssistantToolCall {
                tool_call_id,
                name,
                args,
                signature,
            },
            ChatMessageViewModel::ToolResult {
                tool_call_id,
                content,
            } => ChatHistoryMessageDto::ToolResult {
                tool_call_id,
                content,
            },
            ChatMessageViewModel::ToolApproval {
                tool_call_id,
                approved,
            } => ChatHistoryMessageDto::ToolApproval {
                tool_call_id,
                approved,
            },
        })
        .collect();

    let chat_stream = service
        .stream_chat(
            user_id,
            request.message.filter(|s| !s.is_empty()),
            images,
            chat_history,
        )
        .await
        .map_err(ApiError::from)?;

    let stream = async_stream::stream! {
        let mut chat_stream = std::pin::pin!(chat_stream);

        while let Some(event) = chat_stream.next().await {
            match event {
                ChatStreamEventDto::Text(text) => {
                    yield Ok(Event::default().event("text").data(text));
                }
                ChatStreamEventDto::ToolCall { call_id, name, input, signature } => {
                    let mut data = serde_json::json!({ "call_id": call_id, "name": name, "input": input });
                    if let Some(sig) = signature {
                        data["signature"] = serde_json::Value::String(sig);
                    }
                    yield Ok(Event::default().event("tool_call").data(data.to_string()));
                }
                ChatStreamEventDto::ToolResult { name, output } => {
                    let data = serde_json::json!({ "name": name, "output": output });
                    yield Ok(Event::default().event("tool_result").data(data.to_string()));
                }
                ChatStreamEventDto::Reasoning(text) => {
                    yield Ok(Event::default().event("reasoning").data(text));
                }
                ChatStreamEventDto::Error(e) => {
                    yield Ok(Event::default().event("error").data(format!("AI error: {}", e)));
                }
                ChatStreamEventDto::ToolRequest { tool_call_id, name, args } => {
                    let data = serde_json::json!({ "tool_call_id": tool_call_id, "name": name, "args": args });
                    yield Ok(Event::default().event("tool_request").data(data.to_string()));
                }
                ChatStreamEventDto::Usage { .. } => {}
            }
        }
        yield Ok(Event::default().event("done").data(""));
    };

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}
