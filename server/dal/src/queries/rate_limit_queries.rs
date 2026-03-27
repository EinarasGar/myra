use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use uuid::Uuid;

use crate::idens::rate_limit_idens::{
    GlobalTokenRateLimitsIden, GlobalTokenUsageIden, TokenRateLimitsIden, TokenUsageIden,
};
use crate::idens::CommonsIden;

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn get_default_rate_limits() -> DbQueryWithValues {
    Query::select()
        .columns([
            TokenRateLimitsIden::Id,
            TokenRateLimitsIden::UserId,
            TokenRateLimitsIden::HourlyInputTokens,
            TokenRateLimitsIden::HourlyOutputTokens,
            TokenRateLimitsIden::MonthlyInputTokens,
            TokenRateLimitsIden::MonthlyOutputTokens,
        ])
        .from(TokenRateLimitsIden::Table)
        .and_where(Expr::col(TokenRateLimitsIden::UserId).is_null())
        .limit(1)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_rate_limits(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .columns([
            TokenRateLimitsIden::Id,
            TokenRateLimitsIden::UserId,
            TokenRateLimitsIden::HourlyInputTokens,
            TokenRateLimitsIden::HourlyOutputTokens,
            TokenRateLimitsIden::MonthlyInputTokens,
            TokenRateLimitsIden::MonthlyOutputTokens,
        ])
        .from(TokenRateLimitsIden::Table)
        .and_where(Expr::col(TokenRateLimitsIden::UserId).eq(user_id))
        .limit(1)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_global_rate_limits() -> DbQueryWithValues {
    Query::select()
        .columns([
            GlobalTokenRateLimitsIden::Id,
            GlobalTokenRateLimitsIden::HourlyInputTokens,
            GlobalTokenRateLimitsIden::HourlyOutputTokens,
            GlobalTokenRateLimitsIden::MonthlyInputTokens,
            GlobalTokenRateLimitsIden::MonthlyOutputTokens,
        ])
        .from(GlobalTokenRateLimitsIden::Table)
        .limit(1)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_all_user_overrides() -> DbQueryWithValues {
    Query::select()
        .columns([
            TokenRateLimitsIden::Id,
            TokenRateLimitsIden::UserId,
            TokenRateLimitsIden::HourlyInputTokens,
            TokenRateLimitsIden::HourlyOutputTokens,
            TokenRateLimitsIden::MonthlyInputTokens,
            TokenRateLimitsIden::MonthlyOutputTokens,
        ])
        .from(TokenRateLimitsIden::Table)
        .and_where(Expr::col(TokenRateLimitsIden::UserId).is_not_null())
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_usage(user_id: Uuid, window_type: &str, window_key: &str) -> DbQueryWithValues {
    Query::select()
        .columns([
            TokenUsageIden::Id,
            TokenUsageIden::UserId,
            TokenUsageIden::WindowType,
            TokenUsageIden::WindowKey,
            TokenUsageIden::InputTokens,
            TokenUsageIden::OutputTokens,
        ])
        .from(TokenUsageIden::Table)
        .and_where(Expr::col(TokenUsageIden::UserId).eq(user_id))
        .and_where(Expr::col(TokenUsageIden::WindowType).eq(window_type))
        .and_where(Expr::col(TokenUsageIden::WindowKey).eq(window_key))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_global_usage(window_type: &str, window_key: &str) -> DbQueryWithValues {
    Query::select()
        .columns([
            GlobalTokenUsageIden::Id,
            GlobalTokenUsageIden::WindowType,
            GlobalTokenUsageIden::WindowKey,
            GlobalTokenUsageIden::InputTokens,
            GlobalTokenUsageIden::OutputTokens,
        ])
        .from(GlobalTokenUsageIden::Table)
        .and_where(Expr::col(GlobalTokenUsageIden::WindowType).eq(window_type))
        .and_where(Expr::col(GlobalTokenUsageIden::WindowKey).eq(window_key))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn upsert_user_usage(
    user_id: Uuid,
    window_type: &str,
    window_key: &str,
    input_tokens: i64,
    output_tokens: i64,
) -> DbQueryWithValues {
    Query::insert()
        .into_table(TokenUsageIden::Table)
        .columns([
            TokenUsageIden::UserId,
            TokenUsageIden::WindowType,
            TokenUsageIden::WindowKey,
            TokenUsageIden::InputTokens,
            TokenUsageIden::OutputTokens,
        ])
        .values_panic([
            user_id.into(),
            window_type.into(),
            window_key.into(),
            input_tokens.into(),
            output_tokens.into(),
        ])
        .on_conflict(
            OnConflict::columns([
                TokenUsageIden::UserId,
                TokenUsageIden::WindowType,
                TokenUsageIden::WindowKey,
            ])
            .value(
                TokenUsageIden::InputTokens,
                Expr::col((TokenUsageIden::Table, TokenUsageIden::InputTokens)).add(Expr::col((
                    CommonsIden::Excluded,
                    TokenUsageIden::InputTokens,
                ))),
            )
            .value(
                TokenUsageIden::OutputTokens,
                Expr::col((TokenUsageIden::Table, TokenUsageIden::OutputTokens)).add(Expr::col((
                    CommonsIden::Excluded,
                    TokenUsageIden::OutputTokens,
                ))),
            )
            .to_owned(),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn upsert_global_usage(
    window_type: &str,
    window_key: &str,
    input_tokens: i64,
    output_tokens: i64,
) -> DbQueryWithValues {
    Query::insert()
        .into_table(GlobalTokenUsageIden::Table)
        .columns([
            GlobalTokenUsageIden::WindowType,
            GlobalTokenUsageIden::WindowKey,
            GlobalTokenUsageIden::InputTokens,
            GlobalTokenUsageIden::OutputTokens,
        ])
        .values_panic([
            window_type.into(),
            window_key.into(),
            input_tokens.into(),
            output_tokens.into(),
        ])
        .on_conflict(
            OnConflict::columns([
                GlobalTokenUsageIden::WindowType,
                GlobalTokenUsageIden::WindowKey,
            ])
            .value(
                GlobalTokenUsageIden::InputTokens,
                Expr::col((
                    GlobalTokenUsageIden::Table,
                    GlobalTokenUsageIden::InputTokens,
                ))
                .add(Expr::col((
                    CommonsIden::Excluded,
                    GlobalTokenUsageIden::InputTokens,
                ))),
            )
            .value(
                GlobalTokenUsageIden::OutputTokens,
                Expr::col((
                    GlobalTokenUsageIden::Table,
                    GlobalTokenUsageIden::OutputTokens,
                ))
                .add(Expr::col((
                    CommonsIden::Excluded,
                    GlobalTokenUsageIden::OutputTokens,
                ))),
            )
            .to_owned(),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_all_user_usage_for_windows(window_types_and_keys: &[(&str, &str)]) -> DbQueryWithValues {
    let mut condition = Cond::any();
    for (wt, wk) in window_types_and_keys {
        condition = condition.add(
            Cond::all()
                .add(Expr::col(TokenUsageIden::WindowType).eq(*wt))
                .add(Expr::col(TokenUsageIden::WindowKey).eq(*wk)),
        );
    }

    Query::select()
        .columns([
            TokenUsageIden::Id,
            TokenUsageIden::UserId,
            TokenUsageIden::WindowType,
            TokenUsageIden::WindowKey,
            TokenUsageIden::InputTokens,
            TokenUsageIden::OutputTokens,
        ])
        .from(TokenUsageIden::Table)
        .cond_where(condition)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_all_global_usage_for_windows(
    window_types_and_keys: &[(&str, &str)],
) -> DbQueryWithValues {
    let mut condition = Cond::any();
    for (wt, wk) in window_types_and_keys {
        condition = condition.add(
            Cond::all()
                .add(Expr::col(GlobalTokenUsageIden::WindowType).eq(*wt))
                .add(Expr::col(GlobalTokenUsageIden::WindowKey).eq(*wk)),
        );
    }

    Query::select()
        .columns([
            GlobalTokenUsageIden::Id,
            GlobalTokenUsageIden::WindowType,
            GlobalTokenUsageIden::WindowKey,
            GlobalTokenUsageIden::InputTokens,
            GlobalTokenUsageIden::OutputTokens,
        ])
        .from(GlobalTokenUsageIden::Table)
        .cond_where(condition)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
