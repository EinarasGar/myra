use std::sync::Arc;

use async_trait::async_trait;
use business::providers::user_conversation_provider::UserConversationProvider;
use business::providers::user_rate_limiter::UserRateLimiter;
use business::rate_limiting::rate_limiter::RateLimiter;
use business::service_collection::ai_conversation_service::AiConversationService;
use business::service_collection::ServiceProviders;

use crate::jobs::CronJob;

const TITLE_BATCH_LIMIT: u64 = 20;

pub struct GenerateChatTitlesJob;

#[async_trait]
impl CronJob for GenerateChatTitlesJob {
    const NAME: &'static str = "generate-chat-titles";
    const SCHEDULE: &'static str = "0 */10 * * * *";

    #[tracing::instrument(level = "info", name = "generate_chat_titles", skip_all)]
    async fn tick(providers: &ServiceProviders) -> anyhow::Result<()> {
        let conversation_svc = AiConversationService::new(providers);

        let config = ai::config::AiConfig::try_from_env()?;

        let candidates = conversation_svc
            .get_chats_needing_titles(TITLE_BATCH_LIMIT)
            .await?;

        if candidates.is_empty() {
            return Ok(());
        }

        let mut generated = 0;

        for candidate in candidates {
            let Ok(conv_provider) = UserConversationProvider::open(
                providers,
                candidate.user_id,
                candidate.conversation_id,
            )
            .await
            .inspect_err(|e| {
                tracing::warn!(
                    conversation_id = %candidate.conversation_id,
                    error = ?e,
                    error.type = "open_conversation_provider",
                    "failed to open conversation provider"
                );
            }) else {
                continue;
            };

            let rate_limiter = Arc::new(UserRateLimiter::new(
                RateLimiter::new(providers.redis.clone(), providers.db.clone()),
                candidate.user_id,
            ));

            let conv = ai::conversation::Conversation::new(Arc::new(conv_provider), rate_limiter);

            let Ok(title) = ai::jobs::title::generate_conversation_title(&config, conv)
                .await
                .inspect_err(|e| {
                    tracing::warn!(
                        conversation_id = %candidate.conversation_id,
                        error = ?e,
                        error.type = "generate_title",
                        "failed to generate title"
                    );
                })
            else {
                continue;
            };

            let rows = conversation_svc
                .set_generated_title_if_null(candidate.conversation_id, title)
                .await?;

            if rows > 0 {
                generated += 1;
            }
        }

        tracing::info!(count = generated, "generated chat titles");

        Ok(())
    }
}
