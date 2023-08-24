use serde::{Deserialize, Serialize};
use sqlx::types::{time::OffsetDateTime, Decimal};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairRate {
    pub pair1: i32,
    pub pair2: i32,
    pub rate: Decimal,
    pub date: OffsetDateTime,
}
