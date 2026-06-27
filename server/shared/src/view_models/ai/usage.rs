#[cfg(feature = "backend")]
use business::dtos::ai_usage_dto::{AiUsageDto, AiUsageMetricDto, AiUsageWindowDto};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AiUsageResponseViewModel {
    pub hourly: AiUsageWindowViewModel,
    pub monthly: AiUsageWindowViewModel,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AiUsageWindowViewModel {
    pub input: AiUsageMetricViewModel,
    pub output: AiUsageMetricViewModel,
    #[serde(with = "time::serde::rfc3339")]
    pub reset_at: OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AiUsageMetricViewModel {
    pub used: i64,
    pub limit: i64,
}

#[cfg(feature = "backend")]
impl From<AiUsageDto> for AiUsageResponseViewModel {
    fn from(dto: AiUsageDto) -> Self {
        Self {
            hourly: dto.hourly.into(),
            monthly: dto.monthly.into(),
        }
    }
}

#[cfg(feature = "backend")]
impl From<AiUsageWindowDto> for AiUsageWindowViewModel {
    fn from(dto: AiUsageWindowDto) -> Self {
        Self {
            input: dto.input.into(),
            output: dto.output.into(),
            reset_at: dto.reset_at,
        }
    }
}

#[cfg(feature = "backend")]
impl From<AiUsageMetricDto> for AiUsageMetricViewModel {
    fn from(dto: AiUsageMetricDto) -> Self {
        Self {
            used: dto.used,
            limit: dto.limit,
        }
    }
}
