use sqlx::types::Uuid;
use time::OffsetDateTime;

#[derive(Debug, sqlx::FromRow)]
pub struct ConversationModel {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, sqlx::FromRow)]
pub struct MessageModel {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub role: String,
    pub content: serde_json::Value,
    pub file_ids: Vec<Uuid>,
    pub created_at: OffsetDateTime,
}

#[derive(Debug, sqlx::FromRow)]
pub struct QuickUploadModel {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub status: String,
    pub source_file_id: Uuid,
    pub proposal_type: Option<String>,
    pub proposal_data: Option<serde_json::Value>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}
