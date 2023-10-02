use serde::{Deserialize, Serialize};
use sqlx::types::{time::OffsetDateTime, Decimal};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairRateInsert {
    pub pair_id: i32,
    pub rate: Decimal,
    pub date: OffsetDateTime,
}
