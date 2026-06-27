use time::OffsetDateTime;

#[derive(Debug, Clone)]
pub struct AiUsageDto {
    pub hourly: AiUsageWindowDto,
    pub monthly: AiUsageWindowDto,
}

#[derive(Debug, Clone)]
pub struct AiUsageWindowDto {
    pub input: AiUsageMetricDto,
    pub output: AiUsageMetricDto,
    pub reset_at: OffsetDateTime,
}

#[derive(Debug, Clone)]
pub struct AiUsageMetricDto {
    pub used: i64,
    pub limit: i64,
}
