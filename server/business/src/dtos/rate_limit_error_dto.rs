use serde::Serialize;
use std::fmt;
use time::OffsetDateTime;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TokenWindow {
    Hourly,
    Monthly,
}

impl fmt::Display for TokenWindow {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TokenWindow::Hourly => write!(f, "hourly"),
            TokenWindow::Monthly => write!(f, "monthly"),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TokenType {
    Input,
    Output,
}

impl fmt::Display for TokenType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TokenType::Input => write!(f, "input"),
            TokenType::Output => write!(f, "output"),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LimitScope {
    User,
    Global,
}

impl fmt::Display for LimitScope {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LimitScope::User => write!(f, "user"),
            LimitScope::Global => write!(f, "global"),
        }
    }
}

#[derive(Debug, thiserror::Error)]
#[error("Rate limit exceeded: {scope} {window} {token_type} limit={limit} remaining={remaining} resets_at={reset_at}")]
pub struct RateLimitError {
    pub window: TokenWindow,
    pub token_type: TokenType,
    pub scope: LimitScope,
    pub limit: i64,
    pub remaining: i64,
    pub reset_at: OffsetDateTime,
}

impl From<dal::models::rate_limit_models::QuotaExceeded> for RateLimitError {
    fn from(e: dal::models::rate_limit_models::QuotaExceeded) -> Self {
        let scope = match e.scope.as_str() {
            "global" => LimitScope::Global,
            _ => LimitScope::User,
        };
        let window = match e.window.as_str() {
            "monthly" => TokenWindow::Monthly,
            _ => TokenWindow::Hourly,
        };
        let token_type = match e.token_type.as_str() {
            "output" => TokenType::Output,
            _ => TokenType::Input,
        };
        let reset_at = match window {
            TokenWindow::Hourly => hourly_reset_timestamp(),
            TokenWindow::Monthly => monthly_reset_timestamp(),
        };
        Self {
            window,
            token_type,
            scope,
            limit: e.limit,
            remaining: 0,
            reset_at,
        }
    }
}

pub fn hourly_reset_timestamp() -> OffsetDateTime {
    let now = OffsetDateTime::now_utc();
    let truncated = now
        .replace_minute(0)
        .unwrap()
        .replace_second(0)
        .unwrap()
        .replace_nanosecond(0)
        .unwrap();
    truncated + time::Duration::hours(1)
}

pub fn monthly_reset_timestamp() -> OffsetDateTime {
    let now = OffsetDateTime::now_utc();
    let (year, month, _) = now.to_calendar_date();
    let (next_year, next_month) = if month == time::Month::December {
        (year + 1, time::Month::January)
    } else {
        (year, month.next())
    };
    time::Date::from_calendar_date(next_year, next_month, 1)
        .map(|d| d.with_time(time::Time::MIDNIGHT).assume_utc())
        .unwrap_or(now)
}
