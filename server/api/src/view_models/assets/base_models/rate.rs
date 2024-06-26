use business::dtos::asset_rate_dto::AssetRateDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
        "date": "2000-03-22T23:00:00Z",
        "rate": "12709.75"
}))]
pub struct AssetRateViewModel {
    #[serde(with = "timestamp")]
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
