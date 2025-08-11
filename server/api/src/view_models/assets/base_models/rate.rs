use business::dtos::asset_rate_dto::AssetRateDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetRateViewModel {
    #[serde(with = "timestamp")]
    #[schema(value_type = i32)]
    pub date: OffsetDateTime,
    pub rate: Decimal,
}

impl From<AssetRateDto> for AssetRateViewModel {
    fn from(p: AssetRateDto) -> Self {
        Self {
            date: p.date,
            rate: p.rate,
        }
    }
}
