use sea_query::Iden;

#[allow(dead_code)]
pub enum TokenRateLimitsIden {
    Table,
    Id,
    UserId,
    HourlyInputTokens,
    HourlyOutputTokens,
    MonthlyInputTokens,
    MonthlyOutputTokens,
}

impl Iden for TokenRateLimitsIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "token_rate_limits",
            Self::Id => "id",
            Self::UserId => "user_id",
            Self::HourlyInputTokens => "hourly_input_tokens",
            Self::HourlyOutputTokens => "hourly_output_tokens",
            Self::MonthlyInputTokens => "monthly_input_tokens",
            Self::MonthlyOutputTokens => "monthly_output_tokens",
        }
    }
}

#[allow(dead_code)]
pub enum GlobalTokenRateLimitsIden {
    Table,
    Id,
    HourlyInputTokens,
    HourlyOutputTokens,
    MonthlyInputTokens,
    MonthlyOutputTokens,
}

impl Iden for GlobalTokenRateLimitsIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "global_token_rate_limits",
            Self::Id => "id",
            Self::HourlyInputTokens => "hourly_input_tokens",
            Self::HourlyOutputTokens => "hourly_output_tokens",
            Self::MonthlyInputTokens => "monthly_input_tokens",
            Self::MonthlyOutputTokens => "monthly_output_tokens",
        }
    }
}

#[allow(dead_code)]
pub enum TokenUsageIden {
    Table,
    Id,
    UserId,
    WindowType,
    WindowKey,
    InputTokens,
    OutputTokens,
}

impl Iden for TokenUsageIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "token_usage",
            Self::Id => "id",
            Self::UserId => "user_id",
            Self::WindowType => "window_type",
            Self::WindowKey => "window_key",
            Self::InputTokens => "input_tokens",
            Self::OutputTokens => "output_tokens",
        }
    }
}

#[allow(dead_code)]
pub enum GlobalTokenUsageIden {
    Table,
    Id,
    WindowType,
    WindowKey,
    InputTokens,
    OutputTokens,
}

impl Iden for GlobalTokenUsageIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "global_token_usage",
            Self::Id => "id",
            Self::WindowType => "window_type",
            Self::WindowKey => "window_key",
            Self::InputTokens => "input_tokens",
            Self::OutputTokens => "output_tokens",
        }
    }
}
