use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

use dal::models::ai_conversation_models::MessageModel;

#[derive(Debug, Clone, Serialize)]
pub struct MessageDto {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub role: String,
    pub content: serde_json::Value,
    pub file_ids: Vec<Uuid>,
    pub created_at: OffsetDateTime,
}

impl From<MessageModel> for MessageDto {
    fn from(m: MessageModel) -> Self {
        Self {
            id: m.id,
            conversation_id: m.conversation_id,
            role: m.role,
            content: m.content,
            file_ids: m.file_ids,
            created_at: m.created_at,
        }
    }
}
