use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

use dal::models::ai_conversation_models::{ChatNeedingTitleModel, ConversationModel};

use crate::dtos::ai_error_dto::parse_last_error;

#[derive(Debug, Clone, Serialize)]
pub struct ConversationDto {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: Option<String>,
    pub last_error: Option<crate::dtos::ai_error_dto::AiErrorDto>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatNeedingTitleDto {
    pub conversation_id: Uuid,
    pub user_id: Uuid,
}

impl From<ConversationModel> for ConversationDto {
    fn from(m: ConversationModel) -> Self {
        Self {
            id: m.id,
            user_id: m.user_id,
            title: m.title,
            last_error: m.last_error.and_then(parse_last_error),
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}

impl From<ChatNeedingTitleModel> for ChatNeedingTitleDto {
    fn from(m: ChatNeedingTitleModel) -> Self {
        Self {
            conversation_id: m.conversation_id,
            user_id: m.user_id,
        }
    }
}
