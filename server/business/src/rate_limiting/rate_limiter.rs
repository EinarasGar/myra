#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::rate_limit_models::{
    current_hourly_window_key, current_monthly_window_key, CheckQuotaRedisResult,
    GlobalTokenRateLimitModel, GlobalTokenUsageModel, RecordUsageRedisResult, TokenRateLimitModel,
    TokenUsageModel,
};
use dal::queries::{rate_limit_queries, rate_limit_redis_queries};
#[mockall_double::double]
use dal::redis_connection::RedisConnection;
use uuid::Uuid;

use super::constants::WARNING_THRESHOLD_PCT;
use crate::dtos::rate_limit_error_dto::*;

#[derive(Clone)]
pub struct RateLimiter {
    redis: RedisConnection,
    db: MyraDb,
}

impl RateLimiter {
    pub fn new(redis: RedisConnection, db: MyraDb) -> Self {
        Self { redis, db }
    }

    /// Checks quota and atomically reserves estimated input tokens.
    /// On success, the estimated input tokens are already deducted from all input counters.
    /// Caller MUST eventually call either `record_usage` (to adjust to actual) or
    /// `release_input_reservation` (to roll back on failure).
    pub async fn check_quota(
        &self,
        user_id: Uuid,
        estimated_input_tokens: i64,
    ) -> Result<(), RateLimitError> {
        let hourly_key = current_hourly_window_key();
        let monthly_key = current_monthly_window_key();

        let cmd = rate_limit_redis_queries::check_and_reserve(
            user_id,
            &hourly_key,
            &monthly_key,
            estimated_input_tokens,
        );

        let result = match self.redis.execute_script_string(cmd).await {
            Some(s) => CheckQuotaRedisResult::parse(&s),
            None => {
                self.try_reseed().await;
                return self.check_quota_db_fallback(user_id).await;
            }
        };

        match result {
            CheckQuotaRedisResult::Ok => Ok(()),
            CheckQuotaRedisResult::Reseed => {
                self.try_reseed().await;
                self.check_quota_db_fallback(user_id).await
            }
            CheckQuotaRedisResult::Exceeded(exceeded) => Err(exceeded.into())
        }
    }

    pub async fn release_input_reservation(&self, user_id: Uuid, estimated_input_tokens: i64) {
        if estimated_input_tokens == 0 {
            return;
        }
        let hourly_key = current_hourly_window_key();
        let monthly_key = current_monthly_window_key();
        let cmd = rate_limit_redis_queries::release_reservation(
            user_id,
            &hourly_key,
            &monthly_key,
            estimated_input_tokens,
        );
        self.redis.execute_script_string(cmd).await;
    }

    pub async fn acquire_concurrency_slot(&self, user_id: Uuid) -> bool {
        let cmd = rate_limit_redis_queries::acquire_concurrency(user_id);
        let count = match self.redis.execute_script_int(cmd).await {
            Some(c) => c,
            None => return true,
        };

        if count > rate_limit_redis_queries::max_concurrent_requests() {
            let key = rate_limit_redis_queries::concurrency_key(user_id);
            self.redis.decr(&key).await;
            false
        } else {
            true
        }
    }

    pub async fn release_concurrency_slot(&self, user_id: Uuid) {
        let key = rate_limit_redis_queries::concurrency_key(user_id);
        self.redis.decr(&key).await;
    }

    pub async fn record_usage(
        &self,
        user_id: Uuid,
        input_tokens: u64,
        output_tokens: u64,
        estimated_input_tokens: i64,
    ) {
        let hourly_key = current_hourly_window_key();
        let monthly_key = current_monthly_window_key();
        let input_adjustment = input_tokens as i64 - estimated_input_tokens;

        let cmd = rate_limit_redis_queries::deduct_usage(
            user_id,
            &hourly_key,
            &monthly_key,
            input_adjustment,
            output_tokens as i64,
        );

        if let Some(result) = self.redis.execute_script_vec(cmd).await {
            if let Some(usage) = RecordUsageRedisResult::parse(&result) {
                let warn_pct = WARNING_THRESHOLD_PCT as i64;
                let checks = [
                    (
                        usage.global_usage[0],
                        usage.global_limits[0],
                        "Global hourly input",
                    ),
                    (
                        usage.global_usage[1],
                        usage.global_limits[1],
                        "Global hourly output",
                    ),
                    (
                        usage.global_usage[2],
                        usage.global_limits[2],
                        "Global monthly input",
                    ),
                    (
                        usage.global_usage[3],
                        usage.global_limits[3],
                        "Global monthly output",
                    ),
                ];
                for (current, limit, label) in checks {
                    if limit > 0 && current * 100 >= limit * warn_pct {
                        tracing::warn!("{} tokens at {}%+ of limit", label, warn_pct);
                    }
                }
            }
        }

        let db = self.db.clone();
        let input = input_tokens as i64;
        let output = output_tokens as i64;
        let wk_hourly = hourly_key;
        let wk_monthly = monthly_key;

        tokio::spawn(async move {
            if let Err(e) = db
                .execute(rate_limit_queries::upsert_user_usage(
                    user_id, "hourly", &wk_hourly, input, output,
                ))
                .await
            {
                tracing::error!("Failed to upsert hourly user usage: {}", e);
            }
            if let Err(e) = db
                .execute(rate_limit_queries::upsert_user_usage(
                    user_id,
                    "monthly",
                    &wk_monthly,
                    input,
                    output,
                ))
                .await
            {
                tracing::error!("Failed to upsert monthly user usage: {}", e);
            }
            if let Err(e) = db
                .execute(rate_limit_queries::upsert_global_usage(
                    "hourly", &wk_hourly, input, output,
                ))
                .await
            {
                tracing::error!("Failed to upsert hourly global usage: {}", e);
            }
            if let Err(e) = db
                .execute(rate_limit_queries::upsert_global_usage(
                    "monthly",
                    &wk_monthly,
                    input,
                    output,
                ))
                .await
            {
                tracing::error!("Failed to upsert monthly global usage: {}", e);
            }
        });
    }

    async fn try_reseed(&self) {
        tracing::warn!("Possible Redis restart detected — reseeding from database");

        let hourly_key = current_hourly_window_key();
        let monthly_key = current_monthly_window_key();
        let windows: Vec<(&str, &str)> = vec![
            ("hourly", hourly_key.as_str()),
            ("monthly", monthly_key.as_str()),
        ];

        let user_usages = self
            .db
            .fetch_all::<TokenUsageModel>(rate_limit_queries::get_all_user_usage_for_windows(
                &windows,
            ))
            .await
            .unwrap_or_default();
        let global_usages = self
            .db
            .fetch_all::<GlobalTokenUsageModel>(
                rate_limit_queries::get_all_global_usage_for_windows(&windows),
            )
            .await
            .unwrap_or_default();
        let default_limits = self
            .db
            .fetch_one::<TokenRateLimitModel>(rate_limit_queries::get_default_rate_limits())
            .await
            .ok();
        let global_limits = self
            .db
            .fetch_one::<GlobalTokenRateLimitModel>(rate_limit_queries::get_global_rate_limits())
            .await
            .ok();
        let user_overrides = self
            .db
            .fetch_all::<TokenRateLimitModel>(rate_limit_queries::get_all_user_overrides())
            .await
            .unwrap_or_default();

        for usage in &user_usages {
            let (ik, iv, ok, ov, ttl) = rate_limit_redis_queries::seed_user_usage(usage);
            self.redis.set_ex(&ik, iv, ttl).await;
            self.redis.set_ex(&ok, ov, ttl).await;
        }
        for usage in &global_usages {
            let (ik, iv, ok, ov, ttl) = rate_limit_redis_queries::seed_global_usage(usage);
            self.redis.set_ex(&ik, iv, ttl).await;
            self.redis.set_ex(&ok, ov, ttl).await;
        }
        if let Some(limits) = &default_limits {
            let (key, fields, ttl) = rate_limit_redis_queries::seed_config(limits);
            self.redis.hset_with_expire(&key, &fields, ttl).await;
        }
        if let Some(limits) = &global_limits {
            let (key, fields, ttl) = rate_limit_redis_queries::seed_global_config(limits);
            self.redis.hset_with_expire(key, &fields, ttl).await;
        }
        for limits in &user_overrides {
            let (key, fields, ttl) = rate_limit_redis_queries::seed_config(limits);
            self.redis.hset_with_expire(&key, &fields, ttl).await;
        }
    }

    async fn check_quota_db_fallback(&self, user_id: Uuid) -> Result<(), RateLimitError> {
        tracing::warn!(
            "Rate limit check using DB fallback — quota enforcement is not atomic, \
             concurrent requests may exceed limits"
        );

        let hourly_key = current_hourly_window_key();
        let monthly_key = current_monthly_window_key();

        let user_limits = self
            .db
            .fetch_one::<TokenRateLimitModel>(rate_limit_queries::get_user_rate_limits(user_id))
            .await
            .ok();
        let default_limits = self
            .db
            .fetch_one::<TokenRateLimitModel>(rate_limit_queries::get_default_rate_limits())
            .await
            .ok();
        let limits = user_limits.or(default_limits);
        let global_limits = self
            .db
            .fetch_one::<GlobalTokenRateLimitModel>(rate_limit_queries::get_global_rate_limits())
            .await
            .ok();

        let (limits, global_limits) = match (limits, global_limits) {
            (Some(l), Some(g)) => (l, g),
            _ => {
                tracing::error!("Cannot load rate limits from DB — allowing request");
                return Ok(());
            }
        };

        let checks: [(LimitScope, TokenWindow, i64, &str, TokenType); 8] = [
            (
                LimitScope::User,
                TokenWindow::Hourly,
                limits.hourly_input_tokens,
                "hourly",
                TokenType::Input,
            ),
            (
                LimitScope::User,
                TokenWindow::Hourly,
                limits.hourly_output_tokens,
                "hourly",
                TokenType::Output,
            ),
            (
                LimitScope::User,
                TokenWindow::Monthly,
                limits.monthly_input_tokens,
                "monthly",
                TokenType::Input,
            ),
            (
                LimitScope::User,
                TokenWindow::Monthly,
                limits.monthly_output_tokens,
                "monthly",
                TokenType::Output,
            ),
            (
                LimitScope::Global,
                TokenWindow::Hourly,
                global_limits.hourly_input_tokens,
                "hourly",
                TokenType::Input,
            ),
            (
                LimitScope::Global,
                TokenWindow::Hourly,
                global_limits.hourly_output_tokens,
                "hourly",
                TokenType::Output,
            ),
            (
                LimitScope::Global,
                TokenWindow::Monthly,
                global_limits.monthly_input_tokens,
                "monthly",
                TokenType::Input,
            ),
            (
                LimitScope::Global,
                TokenWindow::Monthly,
                global_limits.monthly_output_tokens,
                "monthly",
                TokenType::Output,
            ),
        ];

        for (scope, window, limit, wtype, token_type) in &checks {
            let wkey = if *wtype == "hourly" {
                &hourly_key
            } else {
                &monthly_key
            };
            let used = match scope {
                LimitScope::User => self
                    .db
                    .fetch_optional::<TokenUsageModel>(rate_limit_queries::get_user_usage(
                        user_id, wtype, wkey,
                    ))
                    .await
                    .unwrap_or(None)
                    .map(|u| match token_type {
                        TokenType::Input => u.input_tokens,
                        TokenType::Output => u.output_tokens,
                    })
                    .unwrap_or(0),
                LimitScope::Global => self
                    .db
                    .fetch_optional::<GlobalTokenUsageModel>(rate_limit_queries::get_global_usage(
                        wtype, wkey,
                    ))
                    .await
                    .unwrap_or(None)
                    .map(|u| match token_type {
                        TokenType::Input => u.input_tokens,
                        TokenType::Output => u.output_tokens,
                    })
                    .unwrap_or(0),
            };
            if used > *limit {
                let reset_at = match window {
                    TokenWindow::Hourly => hourly_reset_timestamp(),
                    TokenWindow::Monthly => monthly_reset_timestamp(),
                };
                return Err(RateLimitError {
                    window: window.clone(),
                    token_type: token_type.clone(),
                    scope: scope.clone(),
                    limit: *limit,
                    remaining: 0,
                    reset_at,
                });
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn test_user_id() -> Uuid {
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    }

    fn default_limits() -> TokenRateLimitModel {
        TokenRateLimitModel {
            id: 1,
            user_id: None,
            hourly_input_tokens: 50000,
            hourly_output_tokens: 50000,
            monthly_input_tokens: 1000000,
            monthly_output_tokens: 1000000,
        }
    }

    fn global_limits() -> GlobalTokenRateLimitModel {
        GlobalTokenRateLimitModel {
            id: 1,
            hourly_input_tokens: 500000,
            hourly_output_tokens: 500000,
            monthly_input_tokens: 10000000,
            monthly_output_tokens: 10000000,
        }
    }

    fn mock_redis_ok() -> RedisConnection {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_string().returning(|_| Some("ok".to_string()));
        redis.expect_clone().returning(|| {
            let mut r = RedisConnection::default();
            r.expect_execute_script_string().returning(|_| Some("ok".to_string()));
            r
        });
        redis
    }

    fn mock_redis_unavailable() -> RedisConnection {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_string().returning(|_| None);
        redis.expect_execute_script_vec().returning(|_| None);
        redis.expect_execute_script_int().returning(|_| None);
        redis.expect_set_ex().returning(|_, _, _| ());
        redis.expect_hset_with_expire().returning(|_, _, _| ());
        redis.expect_decr().returning(|_| ());
        redis.expect_clone().returning(|| {
            let mut r = RedisConnection::default();
            r.expect_execute_script_string().returning(|_| None);
            r.expect_execute_script_vec().returning(|_| None);
            r.expect_execute_script_int().returning(|_| None);
            r.expect_set_ex().returning(|_, _, _| ());
            r.expect_hset_with_expire().returning(|_, _, _| ());
            r.expect_decr().returning(|_| ());
            r
        });
        redis
    }

    fn mock_db_with_limits() -> MyraDb {
        let mut db = MyraDb::default();
        let dl = default_limits();
        let gl = global_limits();
        db.expect_fetch_one::<TokenRateLimitModel>().returning(move |_| Ok(dl.clone()));
        db.expect_fetch_one::<GlobalTokenRateLimitModel>().returning(move |_| Ok(gl.clone()));
        db.expect_fetch_optional::<TokenUsageModel>().returning(|_| Ok(None));
        db.expect_fetch_optional::<GlobalTokenUsageModel>().returning(|_| Ok(None));
        db.expect_fetch_all::<TokenUsageModel>().returning(|_| Ok(vec![]));
        db.expect_fetch_all::<GlobalTokenUsageModel>().returning(|_| Ok(vec![]));
        db.expect_fetch_all::<TokenRateLimitModel>().returning(|_| Ok(vec![]));
        db.expect_execute().returning(|_| Ok(()));
        db.expect_clone().returning(|| {
            let mut d = MyraDb::default();
            d.expect_execute().returning(|_| Ok(()));
            d
        });
        db
    }

    // --- check_quota tests ---

    #[tokio::test]
    async fn check_quota_redis_ok() {
        let redis = mock_redis_ok();
        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis, db);

        let result = limiter.check_quota(test_user_id(), 100).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn check_quota_redis_exceeded() {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_string()
            .returning(|_| Some("user:hourly:input:50000".to_string()));
        redis.expect_clone().returning(|| RedisConnection::default());

        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis, db);

        let result = limiter.check_quota(test_user_id(), 100).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err.scope, LimitScope::User));
        assert!(matches!(err.window, TokenWindow::Hourly));
        assert!(matches!(err.token_type, TokenType::Input));
        assert_eq!(err.limit, 50000);
    }

    #[tokio::test]
    async fn check_quota_redis_exceeded_global_monthly_output() {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_string()
            .returning(|_| Some("global:monthly:output:10000000".to_string()));
        redis.expect_clone().returning(|| RedisConnection::default());

        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis, db);

        let result = limiter.check_quota(test_user_id(), 100).await;
        let err = result.unwrap_err();
        assert!(matches!(err.scope, LimitScope::Global));
        assert!(matches!(err.window, TokenWindow::Monthly));
        assert!(matches!(err.token_type, TokenType::Output));
        assert_eq!(err.limit, 10000000);
    }

    #[tokio::test]
    async fn check_quota_redis_reseed_falls_back_to_db() {
        let mut redis_with_reseed = RedisConnection::default();
        redis_with_reseed.expect_execute_script_string()
            .returning(|_| Some("reseed".to_string()));
        redis_with_reseed.expect_set_ex().returning(|_, _, _| ());
        redis_with_reseed.expect_hset_with_expire().returning(|_, _, _| ());
        redis_with_reseed.expect_clone().returning(|| {
            let mut r = RedisConnection::default();
            r.expect_execute_script_string().returning(|_| None);
            r.expect_set_ex().returning(|_, _, _| ());
            r.expect_hset_with_expire().returning(|_, _, _| ());
            r
        });

        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis_with_reseed, db);

        let result = limiter.check_quota(test_user_id(), 100).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn check_quota_redis_unavailable_falls_back_to_db() {
        let redis = mock_redis_unavailable();
        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis, db);

        let result = limiter.check_quota(test_user_id(), 100).await;
        assert!(result.is_ok());
    }

    // --- DB fallback tests ---

    #[tokio::test]
    async fn db_fallback_user_over_hourly_input() {
        let redis = mock_redis_unavailable();
        let mut db = MyraDb::default();
        let dl = default_limits();
        let gl = global_limits();
        db.expect_fetch_one::<TokenRateLimitModel>().returning(move |_| Ok(dl.clone()));
        db.expect_fetch_one::<GlobalTokenRateLimitModel>().returning(move |_| Ok(gl.clone()));
        db.expect_fetch_optional::<TokenUsageModel>().returning(|_| {
            Ok(Some(TokenUsageModel {
                id: 1,
                user_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
                window_type: "hourly".to_string(),
                window_key: "2026032600".to_string(),
                input_tokens: 999999,
                output_tokens: 0,
            }))
        });
        db.expect_fetch_optional::<GlobalTokenUsageModel>().returning(|_| Ok(None));
        db.expect_fetch_all::<TokenUsageModel>().returning(|_| Ok(vec![]));
        db.expect_fetch_all::<GlobalTokenUsageModel>().returning(|_| Ok(vec![]));
        db.expect_fetch_all::<TokenRateLimitModel>().returning(|_| Ok(vec![]));
        db.expect_execute().returning(|_| Ok(()));
        db.expect_clone().returning(|| {
            let mut d = MyraDb::default();
            d.expect_execute().returning(|_| Ok(()));
            d
        });

        let limiter = RateLimiter::new(redis, db);
        let result = limiter.check_quota(test_user_id(), 100).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err.scope, LimitScope::User));
        assert!(matches!(err.window, TokenWindow::Hourly));
        assert!(matches!(err.token_type, TokenType::Input));
    }

    #[tokio::test]
    async fn db_fallback_allows_when_both_queries_fail() {
        let redis = mock_redis_unavailable();
        let mut db = MyraDb::default();
        db.expect_fetch_one::<TokenRateLimitModel>()
            .returning(|_| Err(sqlx::Error::RowNotFound));
        db.expect_fetch_one::<GlobalTokenRateLimitModel>()
            .returning(|_| Err(sqlx::Error::RowNotFound));
        db.expect_fetch_all::<TokenUsageModel>().returning(|_| Ok(vec![]));
        db.expect_fetch_all::<GlobalTokenUsageModel>().returning(|_| Ok(vec![]));
        db.expect_fetch_all::<TokenRateLimitModel>().returning(|_| Ok(vec![]));
        db.expect_execute().returning(|_| Ok(()));
        db.expect_clone().returning(|| {
            let mut d = MyraDb::default();
            d.expect_execute().returning(|_| Ok(()));
            d
        });

        let limiter = RateLimiter::new(redis, db);
        let result = limiter.check_quota(test_user_id(), 100).await;
        assert!(result.is_ok());
    }

    // --- Concurrency tests ---

    #[tokio::test]
    async fn concurrency_slot_acquired_under_limit() {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_int().returning(|_| Some(1));
        redis.expect_clone().returning(|| RedisConnection::default());

        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis, db);

        assert!(limiter.acquire_concurrency_slot(test_user_id()).await);
    }

    #[tokio::test]
    async fn concurrency_slot_rejected_over_limit() {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_int().returning(|_| Some(3));
        redis.expect_decr().returning(|_| ());
        redis.expect_clone().returning(|| RedisConnection::default());

        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis, db);

        assert!(!limiter.acquire_concurrency_slot(test_user_id()).await);
    }

    #[tokio::test]
    async fn concurrency_slot_fails_open_when_redis_unavailable() {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_int().returning(|_| None);
        redis.expect_clone().returning(|| RedisConnection::default());

        let db = mock_db_with_limits();
        let limiter = RateLimiter::new(redis, db);

        assert!(limiter.acquire_concurrency_slot(test_user_id()).await);
    }

    // --- record_usage tests ---

    #[tokio::test]
    async fn record_usage_with_redis() {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_vec()
            .returning(|_| Some(vec![100, 50, 200, 100, 500000, 500000, 10000000, 10000000]));
        redis.expect_clone().returning(|| RedisConnection::default());

        let mut db = MyraDb::default();
        db.expect_execute().returning(|_| Ok(()));
        db.expect_clone().returning(|| {
            let mut d = MyraDb::default();
            d.expect_execute().returning(|_| Ok(()));
            d
        });

        let limiter = RateLimiter::new(redis, db);
        limiter.record_usage(test_user_id(), 500, 50, 400).await;
    }

    #[tokio::test]
    async fn record_usage_without_redis() {
        let mut redis = RedisConnection::default();
        redis.expect_execute_script_vec().returning(|_| None);
        redis.expect_clone().returning(|| RedisConnection::default());

        let mut db = MyraDb::default();
        db.expect_execute().returning(|_| Ok(()));
        db.expect_clone().returning(|| {
            let mut d = MyraDb::default();
            d.expect_execute().returning(|_| Ok(()));
            d
        });

        let limiter = RateLimiter::new(redis, db);
        limiter.record_usage(test_user_id(), 500, 50, 400).await;
    }
}
