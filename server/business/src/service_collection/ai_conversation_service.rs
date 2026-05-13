#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::ai_conversation_models::{ConversationModel, MessageModel};
use dal::queries::ai_conversation_queries;
use dal::query_params::ai_conversation_params::{GetConversationsParams, GetMessagesParams};
use itertools::Itertools;
use uuid::Uuid;

use crate::dtos::ai_chat_dto::ChatHistoryMessageDto;
use crate::dtos::ai_conversation_dto::ConversationDto;
use crate::dtos::ai_message_dto::MessageDto;

#[derive(Clone)]
pub struct AiConversationService {
    db: MyraDb,
}

impl AiConversationService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
        }
    }

    pub async fn create_conversation(
        &self,
        user_id: Uuid,
        title: Option<&str>,
    ) -> anyhow::Result<ConversationDto> {
        let query =
            ai_conversation_queries::create_conversation(user_id, title.map(|s| s.to_string()));
        let id: Uuid = self.db.fetch_one_scalar(query).await?;
        let now = time::OffsetDateTime::now_utc();
        Ok(ConversationDto {
            id,
            user_id,
            title: title.map(|s| s.to_string()),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn get_conversation(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<ConversationDto> {
        let query = ai_conversation_queries::get_conversations(GetConversationsParams::by_id(
            conversation_id,
            user_id,
        ));
        let model: ConversationModel = self.db.fetch_one(query).await?;
        Ok(model.into())
    }

    /// Verifies the conversation exists and belongs to the user.
    /// Callers that subsequently mutate the conversation (e.g. insert_message)
    /// rely on this check to avoid per-write authorization round trips.
    pub async fn ensure_owns_conversation(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<()> {
        self.get_conversation(conversation_id, user_id).await?;
        Ok(())
    }

    pub async fn get_conversations(
        &self,
        user_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> anyhow::Result<Vec<ConversationDto>> {
        let query = ai_conversation_queries::get_conversations(GetConversationsParams::all(
            user_id, offset, limit,
        ));
        let models: Vec<ConversationModel> = self.db.fetch_all(query).await?;
        Ok(models.into_iter().map_into().collect())
    }

    pub async fn get_messages(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
        after_id: Option<Uuid>,
        limit: u64,
    ) -> anyhow::Result<Vec<MessageDto>> {
        let query = ai_conversation_queries::get_messages(GetMessagesParams {
            conversation_id,
            user_id,
            after_id,
            limit,
        });
        let models: Vec<MessageModel> = self.db.fetch_all(query).await?;
        Ok(models.into_iter().map_into().collect())
    }

    pub async fn insert_message(
        &self,
        conversation_id: Uuid,
        message: impl Into<ChatHistoryMessageDto>,
        file_ids: &[Uuid],
    ) -> anyhow::Result<Uuid> {
        let dto: ChatHistoryMessageDto = message.into();
        let role = dto.role().to_string();
        let content = serde_json::to_value(&dto).expect("ChatHistoryMessageDto serializes to JSON");
        let query = ai_conversation_queries::insert_message(
            conversation_id,
            role,
            content,
            file_ids.to_vec(),
        );
        let id: Uuid = self.db.fetch_one_scalar(query).await?;
        Ok(id)
    }

    pub async fn delete_conversation(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<()> {
        let query = ai_conversation_queries::delete_conversation(conversation_id, user_id);
        self.db.execute(query).await?;
        Ok(())
    }
}
