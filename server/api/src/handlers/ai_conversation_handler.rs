use std::convert::Infallible;

use axum::{
    extract::Path,
    http::StatusCode,
    response::sse::{Event, KeepAlive, Sse},
    Json,
};
use business::dtos::ai_chat_dto::ChatStreamEventDto;
use futures::{Stream, StreamExt};
use itertools::Itertools;
use serde::Deserialize;
use shared::view_models::transactions::validation::Validatable;
use uuid::Uuid;

#[derive(Deserialize)]
pub(crate) struct ConversationIdPath {
    conversation_id: Uuid,
}

use crate::{
    auth::AuthenticatedUserId,
    errors::ApiError,
    extractors::ValidatedJson,
    states::{AiChatServiceState, AiConversationServiceState},
    view_models::ai::conversations::{
        ConversationResponseViewModel, CreateConversationRequestViewModel,
        IdentifiableConversationResponseViewModel, IdentifiableMessageResponseViewModel,
        SendMessageRequestViewModel,
    },
};

#[utoipa::path(
    post,
    path = "/api/users/{user_id}/ai/conversations",
    tag = "AI Conversations",
    responses(
        (status = 201, description = "Conversation created.", body = IdentifiableConversationResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    request_body(content = CreateConversationRequestViewModel),
    security(("auth_token" = []))
)]
pub async fn create_conversation(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    AiConversationServiceState(service): AiConversationServiceState,
    ValidatedJson(body): ValidatedJson<CreateConversationRequestViewModel>,
) -> Result<(StatusCode, Json<IdentifiableConversationResponseViewModel>), ApiError> {
    let dto = service
        .create_conversation(user_id, body.title.as_deref())
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok((StatusCode::CREATED, Json(dto.into())))
}

#[utoipa::path(
    get,
    path = "/api/users/{user_id}/ai/conversations",
    tag = "AI Conversations",
    responses(
        (status = 200, description = "List of conversations.", body = Vec<IdentifiableConversationResponseViewModel>),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    security(("auth_token" = []))
)]
pub async fn list_conversations(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    AiConversationServiceState(service): AiConversationServiceState,
) -> Result<Json<Vec<IdentifiableConversationResponseViewModel>>, ApiError> {
    let dtos = service
        .get_conversations(user_id, 50, 0)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(Json(dtos.into_iter().map_into().collect()))
}

#[utoipa::path(
    get,
    path = "/api/users/{user_id}/ai/conversations/{conversation_id}",
    tag = "AI Conversations",
    responses(
        (status = 200, description = "Conversation details.", body = ConversationResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("conversation_id" = Uuid, Path, description = "Unique identifier of the conversation."),
    ),
    security(("auth_token" = []))
)]
pub async fn get_conversation(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConversationIdPath { conversation_id }): Path<ConversationIdPath>,
    AiConversationServiceState(service): AiConversationServiceState,
) -> Result<Json<ConversationResponseViewModel>, ApiError> {
    let dto = service
        .get_conversation(conversation_id, user_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(Json(dto.into()))
}

#[utoipa::path(
    get,
    path = "/api/users/{user_id}/ai/conversations/{conversation_id}/messages",
    tag = "AI Conversations",
    responses(
        (status = 200, description = "List of messages in the conversation.", body = Vec<IdentifiableMessageResponseViewModel>),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("conversation_id" = Uuid, Path, description = "Unique identifier of the conversation."),
    ),
    security(("auth_token" = []))
)]
pub async fn get_messages(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConversationIdPath { conversation_id }): Path<ConversationIdPath>,
    AiConversationServiceState(service): AiConversationServiceState,
) -> Result<Json<Vec<IdentifiableMessageResponseViewModel>>, ApiError> {
    let dtos = service
        .get_messages(conversation_id, user_id, None, 100)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(Json(dtos.into_iter().map_into().collect()))
}

pub async fn send_message(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConversationIdPath { conversation_id }): Path<ConversationIdPath>,
    AiChatServiceState(chat_service): AiChatServiceState,
    ValidatedJson(request): ValidatedJson<SendMessageRequestViewModel>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ApiError> {
    request.validate()?;

    let tool_approval = request.tool_approval.map(|a| (a.tool_call_id, a.approved));

    let chat_stream = chat_service
        .send(
            user_id,
            conversation_id,
            request.message.map(|m| m.0),
            request.file_ids,
            tool_approval,
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
                ChatStreamEventDto::Done => {
                    yield Ok(Event::default().event("done").data(""));
                    break;
                }
            }
        }
    };

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}
