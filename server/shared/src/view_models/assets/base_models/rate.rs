#[cfg(feature = "backend")]
use business::dtos::asset_rate_dto::AssetRateDto;
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};

use super::positive_rate::PositiveRate;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AssetRateViewModel {
    #[serde(with = "timestamp")]
    #[schema(value_type = i32)]
    pub date: OffsetDateTime,
    pub rate: PositiveRate,
}

#[cfg(feature = "backend")]
impl From<AssetRateDto> for AssetRateViewModel {
    fn from(p: AssetRateDto) -> Self {
        Self {
            date: p.date,
            rate: PositiveRate::from_trusted(p.rate),
        }
    }
}
