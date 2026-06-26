use time::OffsetDateTime;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LimitScope {
    User,
    Global,
}

/// Total classification of every AI failure. Constructed only via the
/// `From` impls below and `AiError::unknown` — classification lives in
/// this file and nowhere else.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum AiError {
    #[error("AI usage limit reached")]
    RateLimited {
        scope: LimitScope,
        reset_at: Option<OffsetDateTime>,
    },
    #[error("The AI provider is rate limiting requests")]
    ProviderRateLimited,
    #[error("The AI provider is unavailable: {detail}")]
    ProviderUnavailable { detail: String },
    #[error("Another AI request is already running")]
    ConcurrencyLimited,
    #[error("The assistant ran out of turns (limit {max_turns})")]
    TurnLimit { max_turns: u32 },
    #[error("Message is too large for a single request")]
    InputTooLarge,
    #[error("Attachment could not be loaded: {detail}")]
    InvalidAttachment { detail: String },
    #[error("Request cannot succeed: {detail}")]
    Fatal { detail: String },
    #[error("Unexpected AI error: {detail}")]
    Unknown { detail: String },
}

#[derive(Debug, Clone, PartialEq)]
pub enum RetryClass {
    Transient {
        min_delay_secs: Option<u64>,
    },
    RateLimited {
        reset_at: Option<OffsetDateTime>,
        scope: LimitScope,
    },
    Terminal,
}

impl AiError {
    /// Every `Unknown` is loud: it is the signal to add a classifier arm.
    pub fn unknown(detail: impl Into<String>) -> Self {
        let detail = detail.into();
        tracing::error!(detail = %detail, error.type = "AiError::Unknown", "Unclassified AI error");
        Self::Unknown { detail }
    }

    pub fn retry_class(&self) -> RetryClass {
        match self {
            Self::RateLimited { scope, reset_at } => RetryClass::RateLimited {
                reset_at: *reset_at,
                scope: *scope,
            },
            Self::ProviderRateLimited => RetryClass::Transient {
                min_delay_secs: None,
            },
            Self::ConcurrencyLimited => RetryClass::Transient {
                min_delay_secs: Some(5),
            },
            Self::ProviderUnavailable { .. }
            | Self::Unknown { .. }
            | Self::InvalidAttachment { .. } => RetryClass::Transient {
                min_delay_secs: None,
            },
            Self::TurnLimit { .. } | Self::InputTooLarge | Self::Fatal { .. } => {
                RetryClass::Terminal
            }
        }
    }
}

fn classify_status(status: u16, detail: String) -> AiError {
    match status {
        429 => AiError::ProviderRateLimited,
        500..=599 => AiError::ProviderUnavailable { detail },
        400 | 401 | 403 | 404 => AiError::Fatal { detail },
        _ => AiError::unknown(detail),
    }
}

fn classify_provider_message(msg: &str) -> AiError {
    let upper = msg.to_uppercase();
    // 1. Explicit rate-limit tokens (check before numeric fallbacks)
    if upper.contains("RESOURCE_EXHAUSTED")
        || upper.contains("EXHAUSTED")
        || upper.contains("QUOTA")
    {
        AiError::ProviderRateLimited
    // 2. Explicit transient tokens
    } else if upper.contains("UNAVAILABLE")
        || upper.contains("OVERLOADED")
        || upper.contains("DEADLINE_EXCEEDED")
    {
        AiError::ProviderUnavailable {
            detail: msg.to_string(),
        }
    // 3. Explicit fatal tokens
    } else if upper.contains("PERMISSION_DENIED")
        || upper.contains("UNAUTHENTICATED")
        || upper.contains("INVALID_ARGUMENT")
        || upper.contains("API KEY")
    {
        AiError::Fatal {
            detail: msg.to_string(),
        }
    // 4. Anchored numeric checks for http_client Display strings (last resort)
    } else if upper.contains("STATUS CODE: 429") {
        AiError::ProviderRateLimited
    } else if upper.contains("STATUS CODE: 500")
        || upper.contains("STATUS CODE: 503")
        || upper.contains("HTTP 5")
    {
        AiError::ProviderUnavailable {
            detail: msg.to_string(),
        }
    } else {
        AiError::unknown(msg)
    }
}

impl From<rig::http_client::Error> for AiError {
    fn from(e: rig::http_client::Error) -> Self {
        use rig::http_client::Error as HE;
        match e {
            HE::InvalidStatusCode(status) => {
                classify_status(status.as_u16(), format!("HTTP {status}"))
            }
            HE::InvalidStatusCodeWithMessage(status, msg) => classify_status(status.as_u16(), msg),
            other => AiError::ProviderUnavailable {
                detail: other.to_string(),
            },
        }
    }
}

impl From<rig::completion::CompletionError> for AiError {
    fn from(e: rig::completion::CompletionError) -> Self {
        use rig::completion::CompletionError as CE;
        match e {
            CE::HttpError(he) => he.into(),
            CE::ProviderError(msg) => classify_provider_message(&msg),
            other => AiError::unknown(other.to_string()),
        }
    }
}

impl From<rig::completion::PromptError> for AiError {
    fn from(e: rig::completion::PromptError) -> Self {
        use rig::completion::PromptError as PE;
        match e {
            PE::CompletionError(ce) => ce.into(),
            PE::MaxTurnsError { max_turns, .. } => AiError::TurnLimit {
                max_turns: u32::try_from(max_turns).unwrap_or(u32::MAX),
            },
            other => AiError::unknown(other.to_string()),
        }
    }
}

impl From<rig::agent::StreamingError> for AiError {
    fn from(e: rig::agent::StreamingError) -> Self {
        use rig::agent::StreamingError as SE;
        match e {
            SE::Completion(ce) => ce.into(),
            SE::Prompt(pe) => (*pe).into(),
            other => AiError::unknown(other.to_string()),
        }
    }
}

impl From<rig::embeddings::embedding::EmbeddingError> for AiError {
    fn from(e: rig::embeddings::embedding::EmbeddingError) -> Self {
        use rig::embeddings::embedding::EmbeddingError as EE;
        match e {
            EE::HttpError(he) => he.into(),
            EE::ProviderError(msg) => classify_provider_message(&msg),
            other => AiError::unknown(other.to_string()),
        }
    }
}

impl From<crate::rate_limit_provider::RateLimitError> for AiError {
    fn from(e: crate::rate_limit_provider::RateLimitError) -> Self {
        use crate::rate_limit_provider::RateLimitError as RL;
        match e {
            RL::QuotaExceeded { scope, reset_at } => AiError::RateLimited { scope, reset_at },
            RL::ConcurrencyLimit => AiError::ConcurrencyLimited,
            RL::PerRequestCap => AiError::InputTooLarge,
            RL::Other(e) => AiError::unknown(format!("{e:#}")),
        }
    }
}

/// The approval hook cancels the prompt loop to pause for user approval —
/// that is a normal control-flow event, not an error. Callers check this
/// BEFORE converting to `AiError`.
pub fn is_prompt_cancelled(e: &rig::agent::StreamingError) -> bool {
    use rig::agent::StreamingError;
    use rig::completion::PromptError;
    matches!(e, StreamingError::Prompt(p) if matches!(**p, PromptError::PromptCancelled { .. }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rig::completion::{CompletionError, PromptError};

    #[test]
    fn max_turns_maps_to_turn_limit() {
        let e = PromptError::MaxTurnsError {
            max_turns: 5,
            chat_history: Box::new(vec![]),
            prompt: Box::new(rig::completion::message::Message::user("x")),
        };
        assert_eq!(AiError::from(e), AiError::TurnLimit { max_turns: 5 });
    }

    #[test]
    fn provider_resource_exhausted_maps_to_provider_rate_limited() {
        let e = CompletionError::ProviderError("RESOURCE_EXHAUSTED: quota".into());
        assert_eq!(AiError::from(e), AiError::ProviderRateLimited);
    }

    #[test]
    fn provider_unavailable_maps_to_provider_unavailable() {
        let e = CompletionError::ProviderError("The model is overloaded".into());
        assert!(matches!(
            AiError::from(e),
            AiError::ProviderUnavailable { .. }
        ));
    }

    #[test]
    fn http_status_503_maps_to_provider_unavailable() {
        let e = CompletionError::HttpError(rig::http_client::Error::InvalidStatusCode(
            http::StatusCode::SERVICE_UNAVAILABLE,
        ));
        assert!(matches!(
            AiError::from(e),
            AiError::ProviderUnavailable { .. }
        ));
    }

    #[test]
    fn http_status_429_maps_to_provider_rate_limited() {
        let e = CompletionError::HttpError(rig::http_client::Error::InvalidStatusCode(
            http::StatusCode::TOO_MANY_REQUESTS,
        ));
        assert!(matches!(AiError::from(e), AiError::ProviderRateLimited));
    }

    #[test]
    fn unrecognized_provider_error_maps_to_unknown() {
        let e = CompletionError::ProviderError("some brand new failure mode".into());
        assert!(matches!(AiError::from(e), AiError::Unknown { .. }));
    }

    #[test]
    fn quota_exceeded_maps_to_rate_limited_preserving_scope() {
        let e = crate::rate_limit_provider::RateLimitError::QuotaExceeded {
            scope: LimitScope::Global,
            reset_at: None,
        };
        assert_eq!(
            AiError::from(e),
            AiError::RateLimited {
                scope: LimitScope::Global,
                reset_at: None
            }
        );
    }

    #[test]
    fn per_request_cap_is_terminal() {
        let e = crate::rate_limit_provider::RateLimitError::PerRequestCap;
        let err = AiError::from(e);
        assert_eq!(err, AiError::InputTooLarge);
        assert!(matches!(err.retry_class(), RetryClass::Terminal));
    }

    #[test]
    fn retry_classes() {
        assert!(matches!(
            AiError::TurnLimit { max_turns: 5 }.retry_class(),
            RetryClass::Terminal
        ));
        assert!(matches!(
            AiError::unknown("x").retry_class(),
            RetryClass::Transient { .. }
        ));
        assert!(matches!(
            AiError::ProviderRateLimited.retry_class(),
            RetryClass::Transient {
                min_delay_secs: None
            }
        ));
    }

    #[test]
    fn invalid_argument_with_numbers_is_fatal_not_transient() {
        let e = CompletionError::ProviderError(
            "INVALID_ARGUMENT: input exceeds the maximum number of tokens allowed (500000)".into(),
        );
        assert!(matches!(AiError::from(e), AiError::Fatal { .. }));
    }

    #[test]
    fn permission_denied_is_fatal() {
        let e = CompletionError::ProviderError("PERMISSION_DENIED: API key not valid".into());
        assert!(matches!(AiError::from(e), AiError::Fatal { .. }));
    }

    #[test]
    fn http_401_is_fatal_terminal() {
        let e = CompletionError::HttpError(rig::http_client::Error::InvalidStatusCode(
            http::StatusCode::UNAUTHORIZED,
        ));
        let err = AiError::from(e);
        assert!(matches!(err, AiError::Fatal { .. }));
        assert!(matches!(err.retry_class(), RetryClass::Terminal));
    }

    #[test]
    fn embedding_quota_message_is_provider_rate_limited() {
        let e = CompletionError::ProviderError(
            "Resource has been exhausted (e.g. check quota).".into(),
        );
        assert!(matches!(AiError::from(e), AiError::ProviderRateLimited));
    }

    #[test]
    fn concurrency_limit_maps_to_dedicated_variant() {
        let e = crate::rate_limit_provider::RateLimitError::ConcurrencyLimit;
        let err = AiError::from(e);
        assert_eq!(err, AiError::ConcurrencyLimited);
        assert!(matches!(
            err.retry_class(),
            RetryClass::Transient {
                min_delay_secs: Some(5)
            }
        ));
    }

    #[test]
    fn prompt_cancelled_is_detected() {
        use rig::agent::StreamingError;
        let cancelled = StreamingError::Prompt(Box::new(PromptError::PromptCancelled {
            chat_history: vec![],
            reason: "approval".into(),
        }));
        assert!(is_prompt_cancelled(&cancelled));
        let not_cancelled = StreamingError::Completion(CompletionError::ProviderError("x".into()));
        assert!(!is_prompt_cancelled(&not_cancelled));
    }
}
