use serde::{Deserialize, Serialize};
use sqlx::types::{time::OffsetDateTime, Decimal};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairRateOption {
    pub pair1: i32,
    pub pair2: i32,
    pub rate: Option<Decimal>,
    pub date: Option<OffsetDateTime>,
}
