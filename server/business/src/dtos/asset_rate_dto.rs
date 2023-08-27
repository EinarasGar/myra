use dal::models::{asset_pair_rate::AssetPairRate, asset_rate::AssetRate};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetRateDto {
    pub rate: Decimal,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

impl From<AssetRate> for AssetRateDto {
    fn from(p: AssetRate) -> Self {
        Self {
            rate: p.rate,
            date: p.date,
        }
    }
}
