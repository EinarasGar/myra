//! Rate-limit policy abstraction. The `Conversation` wrapper calls into this
//! before each turn (to gate admission) and after each turn (to record actual
//! token usage). The implementation lives in the business crate; the ai
//! crate doesn't know how quotas are tracked or what counts as a slot.
//!
//! Lifecycle for one turn:
//! 1. `pre_check(message, images, history)` — the implementer estimates input
//!    cost, checks quota, reserves a concurrency slot. Returns an error if
//!    the request shouldn't proceed.
//! 2. *(LLM run happens)*
//! 3. Either `record_usage(input, output)` — when the run produced a usage
//!    event with real token counts (releases the slot, charges the actual
//!    amount), or `release()` — when the run ended without usage info
//!    (releases the slot, refunds the reservation).

use thiserror::Error;

use crate::models::chat::{Base64Image, ChatHistoryMessage};

#[derive(Debug, Error)]
pub enum RateLimitError {
    #[error("Per-request input token cap exceeded")]
    PerRequestCap,

    #[error("Daily token quota exceeded")]
    QuotaExceeded,

    #[error("Concurrent request limit reached")]
    ConcurrencyLimit,

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

pub trait RateLimitProvider: Send + Sync + 'static {
    /// Decide whether a turn may proceed. Implementer is responsible for
    /// estimation, quota check, and reserving a concurrency slot. On error,
    /// no resources are reserved.
    fn pre_check<'a>(
        &'a self,
        message: &'a str,
        images: &'a [Base64Image],
        history: &'a [ChatHistoryMessage],
    ) -> impl std::future::Future<Output = Result<(), RateLimitError>> + Send + 'a;

    /// Called with the actual token counts when the LLM emits a usage event.
    /// Should release the concurrency slot and reconcile the reservation.
    fn record_usage(
        &self,
        input_tokens: u64,
        output_tokens: u64,
    ) -> impl std::future::Future<Output = ()> + Send;

    /// Called when the turn ends without a usage event (early error,
    /// stream dropped before usage arrived). Should release the
    /// concurrency slot and refund the reservation.
    fn release(&self) -> impl std::future::Future<Output = ()> + Send;
}
