use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

use crate::dtos::rate_limit_error_dto::LimitScope;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AiErrorDto {
    RateLimited {
        scope: LimitScope,
        #[serde(default, with = "time::serde::rfc3339::option")]
        reset_at: Option<OffsetDateTime>,
    },
    ProviderRateLimited,
    ProviderUnavailable {
        detail: String,
    },
    ConcurrencyLimited,
    TurnLimit {
        max_turns: u32,
    },
    InputTooLarge,
    InvalidAttachment {
        detail: String,
    },
    Fatal {
        detail: String,
    },
    Unknown {
        detail: String,
    },
}

impl From<&AiErrorDto> for serde_json::Value {
    fn from(dto: &AiErrorDto) -> Self {
        serde_json::to_value(dto).expect("AiErrorDto is always JSON-serializable")
    }
}

pub fn parse_last_error(v: serde_json::Value) -> Option<AiErrorDto> {
    match serde_json::from_value(v) {
        Ok(dto) => Some(dto),
        Err(e) => {
            tracing::warn!(
                error = &e as &dyn std::error::Error,
                error.type = "last_error_deserialize",
                "failed to deserialize persisted last_error, ignoring"
            );
            None
        }
    }
}

impl From<ai::models::error::AiError> for AiErrorDto {
    fn from(e: ai::models::error::AiError) -> Self {
        use ai::models::error::AiError;
        match e {
            AiError::RateLimited { scope, reset_at } => Self::RateLimited {
                scope: scope.into(),
                reset_at,
            },
            AiError::ProviderRateLimited => Self::ProviderRateLimited,
            AiError::ProviderUnavailable { detail } => Self::ProviderUnavailable { detail },
            AiError::ConcurrencyLimited => Self::ConcurrencyLimited,
            AiError::TurnLimit { max_turns } => Self::TurnLimit { max_turns },
            AiError::InputTooLarge => Self::InputTooLarge,
            AiError::InvalidAttachment { detail } => Self::InvalidAttachment { detail },
            AiError::Fatal { detail } => Self::Fatal { detail },
            AiError::Unknown { detail } => Self::Unknown { detail },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn all_variants() -> Vec<AiErrorDto> {
        vec![
            AiErrorDto::RateLimited {
                scope: LimitScope::Global,
                reset_at: None,
            },
            AiErrorDto::RateLimited {
                scope: LimitScope::User,
                reset_at: Some(time::macros::datetime!(2026-01-01 0:00 UTC)),
            },
            AiErrorDto::ProviderRateLimited,
            AiErrorDto::ProviderUnavailable { detail: "x".into() },
            AiErrorDto::ConcurrencyLimited,
            AiErrorDto::TurnLimit { max_turns: 10 },
            AiErrorDto::InputTooLarge,
            AiErrorDto::InvalidAttachment { detail: "x".into() },
            AiErrorDto::Fatal { detail: "x".into() },
            AiErrorDto::Unknown { detail: "x".into() },
        ]
    }

    #[test]
    fn round_trips_through_json() {
        for dto in all_variants() {
            let v = serde_json::to_value(&dto).unwrap();
            let back: AiErrorDto = serde_json::from_value(v).unwrap();
            assert_eq!(back, dto);
        }
    }

    #[test]
    fn missing_reset_at_key_deserializes_to_none() {
        let v = serde_json::json!({"kind": "rate_limited", "scope": "user"});
        let dto: AiErrorDto = serde_json::from_value(v).unwrap();
        assert_eq!(
            dto,
            AiErrorDto::RateLimited {
                scope: LimitScope::User,
                reset_at: None
            }
        );
    }
}
