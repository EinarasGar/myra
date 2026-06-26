use std::time::Duration;

use ai::models::error::{AiError, LimitScope, RetryClass};
use apalis::prelude::{AbortError, BoxDynError, RetryAfterError};
use time::OffsetDateTime;

pub const GLOBAL_JITTER_MAX_SECS: u64 = 60;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RetryPolicy {
    pub max_transient_attempts: i32,
    pub max_total_attempts: i32,
    pub backoff_base: Duration,
}

impl RetryPolicy {
    pub fn standard() -> Self {
        Self {
            max_transient_attempts: 3,
            max_total_attempts: 5,
            backoff_base: Duration::from_secs(30),
        }
    }

    pub fn fire_and_forget() -> Self {
        Self {
            max_transient_attempts: 1,
            max_total_attempts: 1,
            backoff_base: Duration::from_secs(0),
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum RetryDecision {
    RetryAfter(Duration),
    Abort,
}

impl RetryDecision {
    pub fn into_apalis_error(self, source: impl Into<BoxDynError>) -> BoxDynError {
        match self {
            RetryDecision::RetryAfter(delay) => RetryAfterError::new(source, delay).into(),
            RetryDecision::Abort => AbortError::new(source).into(),
        }
    }
}

pub fn default_decision(
    error: &anyhow::Error,
    attempts: i32,
    policy: &RetryPolicy,
) -> RetryDecision {
    let ai_error = extract_ai_error(error);
    decide(
        &ai_error.retry_class(),
        attempts,
        policy,
        OffsetDateTime::now_utc(),
        random_global_jitter(),
    )
}

pub fn decide(
    class: &RetryClass,
    attempts: i32,
    policy: &RetryPolicy,
    now: OffsetDateTime,
    jitter_secs: u64,
) -> RetryDecision {
    if attempts >= policy.max_total_attempts {
        return RetryDecision::Abort;
    }
    match class {
        RetryClass::Terminal => RetryDecision::Abort,
        RetryClass::Transient { min_delay_secs } => {
            if attempts >= policy.max_transient_attempts {
                return RetryDecision::Abort;
            }
            let backoff = policy.backoff_base.as_secs() * 2u64.pow((attempts.max(1) - 1) as u32);
            let delay = backoff.max(min_delay_secs.unwrap_or(0));
            RetryDecision::RetryAfter(Duration::from_secs(delay))
        }
        RetryClass::RateLimited { reset_at, scope } => match reset_at {
            Some(reset) => {
                let secs = (*reset - now).whole_seconds().max(0) as u64;
                let jitter = match scope {
                    LimitScope::Global => jitter_secs,
                    LimitScope::User => 0,
                };
                RetryDecision::RetryAfter(Duration::from_secs(secs + jitter))
            }
            None => decide(
                &RetryClass::Transient {
                    min_delay_secs: None,
                },
                attempts,
                policy,
                now,
                jitter_secs,
            ),
        },
    }
}

pub fn random_global_jitter() -> u64 {
    use rand::RngExt;
    rand::rng().random_range(0..=GLOBAL_JITTER_MAX_SECS)
}

pub fn extract_ai_error(e: &anyhow::Error) -> AiError {
    e.downcast_ref::<AiError>()
        .cloned()
        .unwrap_or_else(|| AiError::unknown(format!("{e:#}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(1_750_000_000).unwrap()
    }

    fn policy() -> RetryPolicy {
        RetryPolicy::standard()
    }

    fn secs(d: u64) -> RetryDecision {
        RetryDecision::RetryAfter(Duration::from_secs(d))
    }

    #[test]
    fn transient_backoff_doubles() {
        let c = RetryClass::Transient {
            min_delay_secs: None,
        };
        assert_eq!(decide(&c, 1, &policy(), now(), 0), secs(30));
        assert_eq!(decide(&c, 2, &policy(), now(), 0), secs(60));
        assert_eq!(decide(&c, 3, &policy(), now(), 0), RetryDecision::Abort);
    }

    #[test]
    fn retry_after_acts_as_floor() {
        let c = RetryClass::Transient {
            min_delay_secs: Some(120),
        };
        assert_eq!(decide(&c, 1, &policy(), now(), 0), secs(120));
    }

    #[test]
    fn rate_limited_user_schedules_at_reset_without_jitter() {
        let reset = now() + time::Duration::minutes(40);
        let c = RetryClass::RateLimited {
            reset_at: Some(reset),
            scope: LimitScope::User,
        };
        assert_eq!(decide(&c, 1, &policy(), now(), 55), secs(40 * 60));
    }

    #[test]
    fn rate_limited_global_adds_jitter() {
        let reset = now() + time::Duration::minutes(40);
        let c = RetryClass::RateLimited {
            reset_at: Some(reset),
            scope: LimitScope::Global,
        };
        assert_eq!(decide(&c, 1, &policy(), now(), 55), secs(40 * 60 + 55));
    }

    #[test]
    fn rate_limited_past_reset_uses_zero_delay() {
        let reset = now() - time::Duration::minutes(5);
        let c = RetryClass::RateLimited {
            reset_at: Some(reset),
            scope: LimitScope::User,
        };
        assert_eq!(decide(&c, 1, &policy(), now(), 0), secs(0));
    }

    #[test]
    fn rate_limited_without_reset_behaves_like_transient() {
        let c = RetryClass::RateLimited {
            reset_at: None,
            scope: LimitScope::User,
        };
        assert_eq!(decide(&c, 1, &policy(), now(), 0), secs(30));
    }

    #[test]
    fn terminal_fails_immediately() {
        assert_eq!(
            decide(&RetryClass::Terminal, 1, &policy(), now(), 0),
            RetryDecision::Abort
        );
    }

    #[test]
    fn total_attempt_backstop() {
        let c = RetryClass::RateLimited {
            reset_at: Some(now() + time::Duration::minutes(1)),
            scope: LimitScope::User,
        };
        assert_eq!(decide(&c, 5, &policy(), now(), 0), RetryDecision::Abort);
    }

    #[test]
    fn extract_recovers_typed_error_through_anyhow() {
        let e = anyhow::Error::from(AiError::TurnLimit { max_turns: 10 });
        assert_eq!(extract_ai_error(&e), AiError::TurnLimit { max_turns: 10 });
        let plain = anyhow::anyhow!("some plain failure");
        assert!(matches!(extract_ai_error(&plain), AiError::Unknown { .. }));
    }
}
