use dal::models::asser_pair_rate_insert::AssetPairRateInsert;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetPairRateInsertDto {
    pub pair_id: i32,
    pub rate: Decimal,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

impl From<AssetPairRateInsertDto> for AssetPairRateInsert {
    fn from(dto: AssetPairRateInsertDto) -> Self {
        AssetPairRateInsert {
            pair_id: dto.pair_id,
            rate: dto.rate,
            date: dto.date,
        }
    }
}
