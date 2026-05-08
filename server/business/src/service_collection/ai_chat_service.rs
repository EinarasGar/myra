use std::sync::Arc;

use crate::dtos::ai_chat_dto::ChatStreamEventDto;
use crate::dtos::ai_chat_error_dto::AiChatError;
use crate::providers::user_conversation_provider::{subscription_stream, UserConversationProvider};
use crate::providers::user_rate_limiter::UserRateLimiter;
use crate::rate_limiting::rate_limiter::RateLimiter;
use crate::service_collection::ai_action_service::AiActionService;
use crate::service_collection::ai_data_service::AiDataService;
use ai::rate_limit_provider::RateLimitError as AiRateLimitError;
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

    pub async fn send(
        &self,
        user_id: Uuid,
        conversation_id: Uuid,
        message: Option<String>,
        file_ids: Vec<Uuid>,
        tool_approval: Option<(String, bool)>,
    ) -> Result<impl Stream<Item = ChatStreamEventDto>, AiChatError> {
        let providers = self.services.create_providers();
        let conv_agent =
            Arc::new(UserConversationProvider::open(&providers, user_id, conversation_id).await?);

        let data = Arc::new(crate::providers::user_data_provider::UserDataProvider::new(
            AiDataService::new(&providers),
            user_id,
        ));
        let actions = Arc::new(
            crate::providers::user_action_provider::UserActionProvider::new(
                AiActionService::new(&providers),
                user_id,
            ),
        );

        let agent = ai::agents::chat::build_chat_agent_for_user(
            ai::config::AiConfig::try_from_env()?,
            data,
            actions.clone(),
        );

        let rate_limit = Arc::new(UserRateLimiter::new(self.rate_limiter.clone(), user_id));
        let conv = ai::conversation::Conversation::new(conv_agent.clone(), rate_limit);

        let stream_result = conv
            .stream_with_approval(
                agent,
                actions,
                message.unwrap_or_default(),
                file_ids,
                tool_approval,
            )
            .await;
        let rig_stream = match stream_result {
            Ok(s) => s.map(ChatStreamEventDto::from),
            Err(e) => {
                return Err(match e.downcast_ref::<AiRateLimitError>() {
                    Some(AiRateLimitError::PerRequestCap) => AiChatError::PerRequestInputLimit,
                    Some(AiRateLimitError::ConcurrencyLimit) => {
                        AiChatError::ConcurrencyLimitExceeded
                    }
                    _ => AiChatError::Internal(e),
                });
            }
        };

        let handle = conv_agent.drive_stream(rig_stream);
        let receiver = handle.subscribe();
        drop(handle);

        Ok(subscription_stream(receiver))
    }
}
