#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::ai_conversation_models::{ChatNeedingTitleModel, ConversationModel, MessageModel};
use dal::queries::ai_conversation_queries;
use dal::query_params::ai_conversation_params::{
    GetConversationsParams, GetMessagesParams, UpdateConversationErrorParams,
};
use itertools::Itertools;
use uuid::Uuid;

use crate::dtos::ai_chat_dto::ChatHistoryMessageDto;
use crate::dtos::ai_conversation_dto::{ChatNeedingTitleDto, ConversationDto};
use crate::dtos::ai_error_dto::AiErrorDto;
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

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn create_chat(&self, user_id: Uuid) -> anyhow::Result<ConversationDto> {
        self.db.start_transaction().await?;
        let id: Uuid = self
            .db
            .fetch_one_scalar(ai_conversation_queries::create_conversation(user_id))
            .await?;
        self.db
            .execute(ai_conversation_queries::create_chat(id))
            .await?;
        self.db.commit_transaction().await?;

        let now = time::OffsetDateTime::now_utc();
        Ok(ConversationDto {
            id,
            user_id,
            title: None,
            last_error: None,
            created_at: now,
            updated_at: now,
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id, user_id = %user_id))]
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
    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id, user_id = %user_id))]
    pub async fn ensure_owns_conversation(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<()> {
        let query = ai_conversation_queries::get_owned_conversation_id(conversation_id, user_id);
        let _: Uuid = self.db.fetch_one_scalar(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, limit, offset))]
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

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id, user_id = %user_id))]
    pub async fn get_messages(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<MessageDto>> {
        let query = ai_conversation_queries::get_messages(GetMessagesParams {
            conversation_id,
            user_id,
        });
        let models: Vec<MessageModel> = self.db.fetch_all(query).await?;
        Ok(models.into_iter().map_into().collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id, user_id = %user_id))]
    pub async fn get_last_message(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<Option<MessageDto>> {
        let query = ai_conversation_queries::get_last_message(conversation_id, user_id);
        let model: Option<MessageModel> = self.db.fetch_optional(query).await?;
        Ok(model.map(Into::into))
    }

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id, file_count = file_ids.len()))]
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

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id, user_id = %user_id))]
    pub async fn delete_conversation(
        &self,
        conversation_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<()> {
        let query = ai_conversation_queries::delete_conversation(conversation_id, user_id);
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(limit))]
    pub async fn get_chats_needing_titles(
        &self,
        limit: u64,
    ) -> anyhow::Result<Vec<ChatNeedingTitleDto>> {
        let query = ai_conversation_queries::get_chats_needing_titles(limit);
        let models: Vec<ChatNeedingTitleModel> = self.db.fetch_all(query).await?;
        Ok(models.into_iter().map_into().collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id))]
    pub async fn set_generated_title_if_null(
        &self,
        conversation_id: Uuid,
        title: String,
    ) -> anyhow::Result<u64> {
        let query = ai_conversation_queries::update_chat_title_if_null(conversation_id, title);
        Ok(self.db.execute_with_rows_affected(query).await?)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id))]
    pub async fn set_conversation_error(
        &self,
        conversation_id: Uuid,
        error: &AiErrorDto,
    ) -> anyhow::Result<()> {
        let query = ai_conversation_queries::update_conversation_error(
            UpdateConversationErrorParams::set(conversation_id, error),
        );
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(conversation_id = %conversation_id))]
    pub async fn clear_conversation_error(&self, conversation_id: Uuid) -> anyhow::Result<()> {
        let query = ai_conversation_queries::update_conversation_error(
            UpdateConversationErrorParams::clear(conversation_id),
        );
        self.db.execute(query).await?;
        Ok(())
    }
}
