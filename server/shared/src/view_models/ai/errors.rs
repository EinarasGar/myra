#[cfg(feature = "backend")]
use business::dtos::ai_error_dto::AiErrorDto;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AiErrorViewModel {
    pub kind: String,
    pub message: String,
    #[serde(
        default,
        with = "time::serde::rfc3339::option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reset_at: Option<OffsetDateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_turns: Option<u32>,
}

#[cfg(feature = "backend")]
impl AiErrorViewModel {
    fn new(kind: &str, message: impl Into<String>) -> Self {
        Self {
            kind: kind.to_string(),
            message: message.into(),
            reset_at: None,
            scope: None,
            max_turns: None,
        }
    }
}

/// The presentation contract for every AI error: `kind` (the frontend's
/// discriminator), user-facing `message`, and any structured fields the UI
/// needs. One arm per variant — this is the single place that maps a failure
/// to what the user sees.
#[cfg(feature = "backend")]
impl From<AiErrorDto> for AiErrorViewModel {
    fn from(dto: AiErrorDto) -> Self {
        match dto {
            AiErrorDto::RateLimited { scope, reset_at } => Self {
                reset_at,
                scope: Some(scope.to_string()),
                ..Self::new("rate_limited", "AI usage limit reached.")
            },
            AiErrorDto::ProviderRateLimited => Self::new(
                "provider_rate_limited",
                "The AI provider is rate limiting requests.",
            ),
            AiErrorDto::ProviderUnavailable { .. } => Self::new(
                "provider_unavailable",
                "The AI provider is temporarily unavailable.",
            ),
            AiErrorDto::ConcurrencyLimited => Self::new(
                "concurrency_limited",
                "Another AI request is already running. Try again shortly.",
            ),
            AiErrorDto::TurnLimit { max_turns } => Self {
                max_turns: Some(max_turns),
                ..Self::new(
                    "turn_limit",
                    format!("The assistant stopped after reaching its limit of {max_turns} steps."),
                )
            },
            AiErrorDto::InputTooLarge => Self::new(
                "input_too_large",
                "Your message is too large for a single request.",
            ),
            AiErrorDto::InvalidAttachment { .. } => {
                Self::new("invalid_attachment", "Your attachment could not be loaded.")
            }
            AiErrorDto::Fatal { .. } => Self::new(
                "fatal",
                "The AI request was rejected and cannot be retried.",
            ),
            AiErrorDto::Unknown { .. } => Self::new(
                "unknown",
                "Something went wrong while generating a response.",
            ),
        }
    }
}
