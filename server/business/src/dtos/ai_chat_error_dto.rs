#[derive(Debug, thiserror::Error)]
pub enum AiChatError {
    #[error("Rate limit exceeded")]
    RateLimited(#[from] crate::dtos::rate_limit_error_dto::RateLimitError),
    #[error("Per-request input token limit exceeded")]
    PerRequestInputLimit,
    #[error("Too many concurrent AI requests")]
    ConcurrencyLimitExceeded,
    #[error("{0}")]
    Internal(#[from] anyhow::Error),
}
