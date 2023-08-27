use serde::{Deserialize, Serialize};
use sqlx::types::{time::OffsetDateTime, Decimal};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetRate {
    pub rate: Decimal,
    pub date: OffsetDateTime,
}
