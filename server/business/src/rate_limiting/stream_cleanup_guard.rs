use super::rate_limiter::RateLimiter;
use uuid::Uuid;

/// Guard that ensures concurrency slot release and input reservation cleanup
/// happen even when the SSE stream is dropped (client disconnect).
pub(crate) struct StreamCleanupGuard {
    pub rate_limiter: Option<RateLimiter>,
    pub user_id: Uuid,
    pub estimated_input_tokens: i64,
    pub usage_recorded: bool,
}

impl Drop for StreamCleanupGuard {
    fn drop(&mut self) {
        if !self.usage_recorded {
            if let Some(rl) = self.rate_limiter.take() {
                let user_id = self.user_id;
                let estimated = self.estimated_input_tokens;
                tokio::spawn(async move {
                    rl.release_input_reservation(user_id, estimated).await;
                    rl.release_concurrency_slot(user_id).await;
                });
            }
        }
    }
}
