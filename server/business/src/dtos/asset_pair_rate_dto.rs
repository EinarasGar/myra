use dal::models::asset_models::AssetPairRate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetPairRateDto {
    pub asset1_id: i32,
    pub asset2_id: i32,
    pub rate: Decimal,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

impl From<AssetPairRate> for AssetPairRateDto {
    fn from(p: AssetPairRate) -> Self {
        Self {
            asset1_id: p.pair1,
            asset2_id: p.pair2,
            rate: p.rate,
            date: p.recorded_at,
        }
    }
}

impl From<AssetPairRateDto> for AssetPairRate {
    fn from(p: AssetPairRateDto) -> Self {
        Self {
            pair1: p.asset1_id,
            pair2: p.asset2_id,
            rate: p.rate,
            recorded_at: p.date,
        }
    }
}
