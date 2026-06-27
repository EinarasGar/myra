use uuid::Uuid;

use crate::dtos::ai_usage_dto::AiUsageDto;
use crate::rate_limiting::rate_limiter::RateLimiter;

#[derive(Clone)]
pub struct AiUsageService {
    rate_limiter: RateLimiter,
}

impl AiUsageService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            rate_limiter: RateLimiter::new(providers.redis.clone(), providers.db.clone()),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_usage(&self, user_id: Uuid) -> anyhow::Result<AiUsageDto> {
        self.rate_limiter.get_usage(user_id).await
    }
}
