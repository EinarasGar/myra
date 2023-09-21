use business::dtos::{asset_pair_rate_dto::AssetPairRateDto, asset_rate_dto::AssetRateDto};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{
    serde::{rfc3339},
    OffsetDateTime,
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
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

// impl Default for AssetRateViewModel {
//     fn default() -> Self {
//         Self {
//             date: OffsetDateTime::now_utc(),
//             rate: Default::default(),
//         }
//     }
// }
