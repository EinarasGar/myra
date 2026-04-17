use std::sync::Arc;

use crate::dtos::ai_chat_dto::{Base64ImageDto, ChatHistoryMessageDto, ChatStreamEventDto};
use crate::dtos::ai_chat_error_dto::AiChatError;
use crate::rate_limiting::rate_limiter::RateLimiter;
use crate::rate_limiting::stream_cleanup_guard::StreamCleanupGuard;
use crate::rate_limiting::token_estimator;
use crate::service_collection::ai_action_service::AiActionService;
use crate::service_collection::ai_data_service::AiDataService;
use ai::models::chat::Base64Image;
use futures::{Stream, StreamExt};
use uuid::Uuid;

pub struct AiChatService {
    services: super::Services,
    rate_limiter: RateLimiter,
}

impl AiChatService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        let rate_limiter = RateLimiter::new(providers.redis.clone(), providers.db.clone());
        Self {
            services: providers.services.clone(),
            rate_limiter,
        }
    }

    pub async fn stream_chat(
        &self,
        user_id: Uuid,
        message: Option<String>,
        images: Option<Vec<Base64ImageDto>>,
        history: Vec<ChatHistoryMessageDto>,
    ) -> Result<impl Stream<Item = ChatStreamEventDto>, AiChatError> {
        let estimated_tokens = token_estimator::estimate_input_tokens(&message, &images, &history);
        if token_estimator::exceeds_per_request_cap(estimated_tokens) {
            return Err(AiChatError::PerRequestInputLimit);
        }

        let config = ai::config::AiConfig::try_from_env()?;

        self.rate_limiter
            .check_quota(user_id, estimated_tokens)
            .await?;

        if !self.rate_limiter.acquire_concurrency_slot(user_id).await {
            self.rate_limiter
                .release_input_reservation(user_id, estimated_tokens)
                .await;
            return Err(AiChatError::ConcurrencyLimitExceeded);
        }

        let providers = self.services.create_providers();
        let data = Arc::new(AiDataService::new(&providers));
        let actions = Arc::new(AiActionService::new(&providers));

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
        .await
        .map(ChatStreamEventDto::from);

        let guard_limiter = self.rate_limiter.clone();
        let stream_limiter = self.rate_limiter.clone();
        let wrapped = async_stream::stream! {
            let mut guard = StreamCleanupGuard {
                rate_limiter: Some(guard_limiter),
                user_id,
                estimated_input_tokens: estimated_tokens,
                usage_recorded: false,
            };

            let mut inner = std::pin::pin!(stream);
            let mut total_input = 0u64;
            let mut total_output = 0u64;
            while let Some(event) = inner.next().await {
                match &event {
                    ChatStreamEventDto::Usage { input_tokens, output_tokens } => {
                        total_input = *input_tokens;
                        total_output = *output_tokens;
                    }
                    _ => { yield event; }
                }
            }

            stream_limiter.record_usage(user_id, total_input, total_output, estimated_tokens).await;
            stream_limiter.release_concurrency_slot(user_id).await;
            guard.usage_recorded = true;
        };
        Ok(wrapped)
    }
}
