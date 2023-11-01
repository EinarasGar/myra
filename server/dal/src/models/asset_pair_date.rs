use serde::{Deserialize, Serialize};
use sqlx::types::time::OffsetDateTime;

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairDate {
    pub pair1: i32,
    pub pair2: i32,
    pub date: OffsetDateTime,
}
