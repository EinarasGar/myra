use dal::models::asset_models::AssetPairRateInsert;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetPairRateInsertDto {
    pub pair_id: i32,
    pub rate: Decimal,
    #[serde(with = "timestamp")]
    pub date: OffsetDateTime,
}

impl From<AssetPairRateInsertDto> for AssetPairRateInsert {
    fn from(dto: AssetPairRateInsertDto) -> Self {
        AssetPairRateInsert {
            pair_id: dto.pair_id,
            rate: dto.rate,
            recorded_at: dto.date,
        }
    }
}
