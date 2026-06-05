use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

use dal::models::ai_conversation_models::{ChatNeedingTitleModel, ConversationModel};

#[derive(Debug, Clone, Serialize)]
pub struct ConversationDto {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: Option<String>,
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
