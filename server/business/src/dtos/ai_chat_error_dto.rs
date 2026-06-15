use crate::dtos::ai_error_dto::AiErrorDto;

#[derive(Debug, thiserror::Error)]
pub enum AiChatError {
    #[error("AI error: {0:?}")]
    Ai(AiErrorDto),
    #[error("No interrupted turn to retry")]
    NothingToRetry,
    #[error("{0}")]
    Internal(#[from] anyhow::Error),
}
