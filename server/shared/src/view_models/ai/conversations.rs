#[cfg(feature = "backend")]
use business::dtos::{
    ai_chat_dto::ChatHistoryMessageDto, ai_conversation_dto::ConversationDto,
    ai_message_dto::MessageDto,
};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CreateConversationRequestViewModel {
    pub title: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(transparent)]
pub struct UserMessage(pub String);

impl UserMessage {
    pub fn is_empty(&self) -> bool {
        self.0.trim().is_empty()
    }
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ToolApprovalViewModel {
    pub tool_call_id: String,
    pub approved: bool,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct SendMessageRequestViewModel {
    pub message: Option<UserMessage>,
    #[serde(default)]
    pub file_ids: Vec<Uuid>,
    pub tool_approval: Option<ToolApprovalViewModel>,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ConversationResponseViewModel {
    pub title: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableConversationResponseViewModel {
    pub id: Uuid,
    pub title: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableMessageResponseViewModel {
    pub id: Uuid,
    pub role: String,
    pub content: serde_json::Value,
    pub file_ids: Vec<Uuid>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[cfg(feature = "backend")]
impl From<UserMessage> for ChatHistoryMessageDto {
    fn from(msg: UserMessage) -> Self {
        Self::User { content: msg.0 }
    }
}

#[cfg(feature = "backend")]
impl From<ConversationDto> for ConversationResponseViewModel {
    fn from(dto: ConversationDto) -> Self {
        Self {
            title: dto.title,
            created_at: dto.created_at,
            updated_at: dto.updated_at,
        }
    }
}

#[cfg(feature = "backend")]
impl From<ConversationDto> for IdentifiableConversationResponseViewModel {
    fn from(dto: ConversationDto) -> Self {
        Self {
            id: dto.id,
            title: dto.title,
            created_at: dto.created_at,
            updated_at: dto.updated_at,
        }
    }
}

#[cfg(feature = "backend")]
impl From<MessageDto> for IdentifiableMessageResponseViewModel {
    fn from(dto: MessageDto) -> Self {
        Self {
            id: dto.id,
            role: dto.role,
            content: dto.content,
            file_ids: dto.file_ids,
            created_at: dto.created_at,
        }
    }
}
