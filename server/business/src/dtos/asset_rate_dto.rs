use dal::models::asset_rate::AssetRate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetRateDto {
    pub rate: Decimal,
    pub date: OffsetDateTime,
}

impl Default for AssetRateDto {
    fn default() -> Self {
        Self {
            rate: Decimal::new(0, 0),
            date: OffsetDateTime::now_utc(),
        }
    }
}

impl From<AssetRate> for AssetRateDto {
    fn from(p: AssetRate) -> Self {
        Self {
            rate: p.rate,
            date: p.date,
        }
    }
}
