use std::sync::Arc;

use crate::dtos::ai_chat_dto::{ChatHistoryMessageDto, ChatStreamEventDto};
use crate::service_collection::ai_data_service::AiDataService;
use dal::database_context::MyraDb;
use futures::{Stream, StreamExt};
use uuid::Uuid;

pub struct AiChatService {
    db: MyraDb,
}

impl AiChatService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    pub async fn stream_chat(
        &self,
        user_id: Uuid,
        message: String,
        history: Vec<ChatHistoryMessageDto>,
    ) -> anyhow::Result<impl Stream<Item = ChatStreamEventDto>> {
        let config = ai::config::AiConfig::try_from_env()?;
        let data = Arc::new(AiDataService::new(self.db.clone()));

        let ai_history = history.into_iter().map(Into::into).collect();

        let stream =
            ai::agents::chat::run_chat_stream(config, data, user_id, message, ai_history).await;

        Ok(stream.map(ChatStreamEventDto::from))
    }
}
