use std::sync::Arc;

use crate::dtos::ai_chat_dto::{Base64ImageDto, ChatHistoryMessageDto, ChatStreamEventDto};
use crate::service_collection::ai_action_service::AiActionService;
use crate::service_collection::ai_data_service::AiDataService;
use ai::models::chat::Base64Image;
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
        message: Option<String>,
        images: Option<Vec<Base64ImageDto>>,
        history: Vec<ChatHistoryMessageDto>,
    ) -> anyhow::Result<impl Stream<Item = ChatStreamEventDto>> {
        let config = ai::config::AiConfig::try_from_env()?;
        let data = Arc::new(AiDataService::new(self.db.clone()));
        let actions = Arc::new(AiActionService::new(self.db.clone()));

        let ai_images = images.map(|imgs| {
            imgs.into_iter()
                .map(|i| Base64Image {
                    media_type: i.media_type,
                    data: i.data,
                })
                .collect::<Vec<_>>()
        });
        let ai_history = history.into_iter().map(Into::into).collect();

        let stream = ai::agents::chat::run_chat_stream(
            config, data, actions, user_id, message, ai_images, ai_history,
        )
        .await;

        Ok(stream.map(ChatStreamEventDto::from))
    }
}
