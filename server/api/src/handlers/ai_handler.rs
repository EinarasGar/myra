use std::convert::Infallible;

use axum::{
    extract::Path,
    response::sse::{Event, KeepAlive, Sse},
    Json,
};
use business::dtos::ai_chat_dto::{ChatHistoryMessageDto, ChatStreamEventDto};
use futures::{Stream, StreamExt};
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    states::AiChatServiceState,
    view_models::ai::chat::{ChatRequestViewModel, ChatRole},
};

pub async fn chat(
    Path(user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    AiChatServiceState(service): AiChatServiceState,
    Json(request): Json<ChatRequestViewModel>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = async_stream::stream! {
        let chat_history: Vec<ChatHistoryMessageDto> = request
            .history
            .into_iter()
            .map(|m| match m.role {
                ChatRole::User => ChatHistoryMessageDto::User(m.content),
                ChatRole::Assistant => ChatHistoryMessageDto::Assistant(m.content),
            })
            .collect();

        match service.stream_chat(user_id, request.message, chat_history).await {
            Ok(chat_stream) => {
                let mut chat_stream = std::pin::pin!(chat_stream);

                while let Some(event) = chat_stream.next().await {
                    match event {
                        ChatStreamEventDto::Text(text) => {
                            yield Ok(Event::default().event("text").data(text));
                        }
                        ChatStreamEventDto::ToolCall { name, input } => {
                            let data = serde_json::json!({ "name": name, "input": input });
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
                    }
                }
            }
            Err(e) => {
                yield Ok(Event::default().event("error").data(format!("AI not configured: {}", e)));
            }
        }

        yield Ok(Event::default().event("done").data(""));
    };

    Sse::new(stream).keep_alive(KeepAlive::default())
}
