//! Per-user adapter that implements the ai crate's `RateLimitProvider`.
//! Bundles the shared `RateLimiter` with a specific user identity and
//! tracks the current turn's input estimate so `record_usage` and
//! `release` can reconcile the reservation properly.

use std::sync::Mutex;

use ai::models::chat::{Base64Image, ChatHistoryMessage};
use ai::rate_limit_provider::{RateLimitError as AiRateLimitError, RateLimitProvider};
use uuid::Uuid;

use crate::rate_limiting::rate_limiter::RateLimiter;
use crate::rate_limiting::token_estimator;

pub struct UserRateLimiter {
    rate_limiter: RateLimiter,
    user_id: Uuid,
    /// Tracks the input-token estimate reserved by `pre_check`, needed by
    /// `record_usage`/`release` to reconcile the reservation. `Mutex<i64>`
    /// (not `tokio::Mutex`) because contention is impossible: each turn has
    /// its own `UserRateLimiter` and methods are called serially.
    reserved_input_tokens: Mutex<Option<i64>>,
}

impl UserRateLimiter {
    pub fn new(rate_limiter: RateLimiter, user_id: Uuid) -> Self {
        Self {
            rate_limiter,
            user_id,
            reserved_input_tokens: Mutex::new(None),
        }
    }

    fn take_reservation(&self) -> Option<i64> {
        self.reserved_input_tokens
            .lock()
            .ok()
            .and_then(|mut guard| guard.take())
    }
}

impl RateLimitProvider for UserRateLimiter {
    async fn pre_check(
        &self,
        message: &str,
        images: &[Base64Image],
        history: &[ChatHistoryMessage],
    ) -> Result<(), AiRateLimitError> {
        // Estimator wants `Option<String>` for the message and DTO image
        // shape; cheap to adapt locally.
        let message_opt = if message.is_empty() {
            None
        } else {
            Some(message.to_string())
        };
        let dto_images: Vec<crate::dtos::ai_chat_dto::Base64ImageDto> = images
            .iter()
            .map(|i| crate::dtos::ai_chat_dto::Base64ImageDto {
                media_type: i.media_type.clone(),
                data: i.data.clone(),
            })
            .collect();
        let history_dtos: Vec<crate::dtos::ai_chat_dto::ChatHistoryMessageDto> = history
            .iter()
            .cloned()
            .map(crate::dtos::ai_chat_dto::ChatHistoryMessageDto::from)
            .collect();

        let estimated =
            token_estimator::estimate_input_tokens(&message_opt, &dto_images, &history_dtos);
        if token_estimator::exceeds_per_request_cap(estimated) {
            return Err(AiRateLimitError::PerRequestCap);
        }

        self.rate_limiter
            .check_quota(self.user_id, estimated)
            .await
            .map_err(|_| AiRateLimitError::QuotaExceeded)?;

        if !self
            .rate_limiter
            .acquire_concurrency_slot(self.user_id)
            .await
        {
            self.rate_limiter
                .release_input_reservation(self.user_id, estimated)
                .await;
            return Err(AiRateLimitError::ConcurrencyLimit);
        }

        if let Ok(mut guard) = self.reserved_input_tokens.lock() {
            *guard = Some(estimated);
        }
        Ok(())
    }

    async fn record_usage(&self, input_tokens: u64, output_tokens: u64) {
        let estimated = self.take_reservation().unwrap_or(0);
        self.rate_limiter
            .record_usage(self.user_id, input_tokens, output_tokens, estimated)
            .await;
        self.rate_limiter
            .release_concurrency_slot(self.user_id)
            .await;
    }

    async fn release(&self) {
        if let Some(estimated) = self.take_reservation() {
            self.rate_limiter
                .release_input_reservation(self.user_id, estimated)
                .await;
            self.rate_limiter
                .release_concurrency_slot(self.user_id)
                .await;
        }
    }
}
