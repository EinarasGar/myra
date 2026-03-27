use time::macros::format_description;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(sqlx::FromRow, Clone, Debug)]
pub struct TokenRateLimitModel {
    pub id: i32,
    pub user_id: Option<Uuid>,
    pub hourly_input_tokens: i64,
    pub hourly_output_tokens: i64,
    pub monthly_input_tokens: i64,
    pub monthly_output_tokens: i64,
}

#[derive(sqlx::FromRow, Clone, Debug)]
pub struct GlobalTokenRateLimitModel {
    pub id: i32,
    pub hourly_input_tokens: i64,
    pub hourly_output_tokens: i64,
    pub monthly_input_tokens: i64,
    pub monthly_output_tokens: i64,
}

#[derive(sqlx::FromRow, Clone, Debug)]
pub struct TokenUsageModel {
    pub id: i32,
    pub user_id: Uuid,
    pub window_type: String,
    pub window_key: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

#[derive(sqlx::FromRow, Clone, Debug)]
pub struct GlobalTokenUsageModel {
    pub id: i32,
    pub window_type: String,
    pub window_key: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

pub fn current_hourly_window_key() -> String {
    let now = OffsetDateTime::now_utc();
    let fmt = format_description!("[year][month][day][hour]");
    now.format(&fmt).unwrap_or_default()
}

pub fn current_monthly_window_key() -> String {
    let now = OffsetDateTime::now_utc();
    let fmt = format_description!("[year][month]");
    now.format(&fmt).unwrap_or_default()
}

pub struct QuotaExceeded {
    pub scope: String,
    pub window: String,
    pub token_type: String,
    pub limit: i64,
}

pub enum CheckQuotaRedisResult {
    Ok,
    Reseed,
    Exceeded(QuotaExceeded),
}

impl CheckQuotaRedisResult {
    pub fn parse(s: &str) -> Self {
        match s {
            "ok" => Self::Ok,
            "reseed" => Self::Reseed,
            other => {
                let parts: Vec<&str> = other.splitn(4, ':').collect();
                if parts.len() == 4 {
                    Self::Exceeded(QuotaExceeded {
                        scope: parts[0].to_string(),
                        window: parts[1].to_string(),
                        token_type: parts[2].to_string(),
                        limit: parts[3].parse().unwrap_or(0),
                    })
                } else {
                    Self::Reseed
                }
            }
        }
    }
}

pub struct RecordUsageRedisResult {
    pub global_usage: [i64; 4],
    pub global_limits: [i64; 4],
}

impl RecordUsageRedisResult {
    pub fn parse(vals: &[i64]) -> Option<Self> {
        if vals.len() >= 8 {
            Some(Self {
                global_usage: [vals[0], vals[1], vals[2], vals[3]],
                global_limits: [vals[4], vals[5], vals[6], vals[7]],
            })
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_record_usage_splits_usage_and_limits_correctly() {
        let vals = vec![100, 200, 300, 400, 500000, 500000, 10000000, 10000000];
        let result = RecordUsageRedisResult::parse(&vals).unwrap();
        assert_eq!(result.global_usage, [100, 200, 300, 400]);
        assert_eq!(result.global_limits, [500000, 500000, 10000000, 10000000]);
    }
}
