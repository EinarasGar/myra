use std::sync::Arc;

use apalis::prelude::{BoxDynError, Data};
use business::providers::user_conversation_provider::UserConversationProvider;
use business::providers::user_rate_limiter::UserRateLimiter;
use business::rate_limiting::rate_limiter::RateLimiter;
use business::service_collection::ai_conversation_service::AiConversationService;
use business::service_collection::Services;

use super::CronTick;

const TITLE_BATCH_LIMIT: u64 = 20;

#[tracing::instrument(name = "generate_chat_titles", skip_all, err)]
pub async fn tick(_tick: CronTick, services: Data<Services>) -> Result<(), BoxDynError> {
    let providers = services.create_providers();
    let conversation_svc = AiConversationService::new(&providers);

    let config = ai::config::AiConfig::try_from_env()?;

    let candidates = conversation_svc
        .get_chats_needing_titles(TITLE_BATCH_LIMIT)
        .await?;

    if candidates.is_empty() {
        tracing::info!("No title candidates to process");
        return Ok(());
    }

    tracing::info!("Processing {} title candidates", candidates.len());

    for candidate in candidates {
        let Ok(conv_provider) = UserConversationProvider::open(
            &providers,
            candidate.user_id,
            candidate.conversation_id,
        )
        .await
        .inspect_err(|e| {
            tracing::warn!(
                conversation_id = ?candidate.conversation_id,
                "Failed to open conversation provider: {e}"
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
                    conversation_id = ?candidate.conversation_id,
                    "Failed to generate title: {e}"
                );
            })
        else {
            continue;
        };

        let rows = conversation_svc
            .set_generated_title_if_null(candidate.conversation_id, title.clone())
            .await?;

        if rows == 0 {
            tracing::info!(
                conversation_id = ?candidate.conversation_id,
                "Title was already set, skipping update"
            );
        } else {
            tracing::info!(
                conversation_id = ?candidate.conversation_id,
                title,
                "Generated and persisted title"
            );
        }
    }

    Ok(())
}
