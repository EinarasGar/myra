use business::dtos::{asset_pair_rate_dto::AssetPairRateDto, asset_rate_dto::AssetRateDto};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::rfc3339, OffsetDateTime};
use utoipa::ToSchema;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
        "date": "2000-03-22T23:00:00Z",
        "rate": "12709.75"
}))]
pub struct AssetRateViewModel {
    #[serde(with = "rfc3339")]
    pub date: OffsetDateTime,
    pub rate: Decimal,
}

impl From<AssetPairRateDto> for AssetRateViewModel {
    fn from(p: AssetPairRateDto) -> Self {
        Self {
            date: p.date,
            rate: p.rate,
        }
    }
}

impl From<AssetRateDto> for AssetRateViewModel {
    fn from(p: AssetRateDto) -> Self {
        Self {
            date: p.date,
            rate: p.rate,
        }
    }
}

impl From<AssetRateViewModel> for AssetRateDto {
    fn from(p: AssetRateViewModel) -> Self {
        Self {
            date: p.date,
            rate: p.rate,
        }
    }
}

// impl Default for AssetRateViewModel {
//     fn default() -> Self {
//         Self {
//             date: OffsetDateTime::now_utc(),
//             rate: Default::default(),
//         }
//     }
// }
