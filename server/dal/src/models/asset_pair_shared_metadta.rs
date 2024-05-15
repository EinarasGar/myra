use serde::{Deserialize, Serialize};
use sqlx::types::Decimal;

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairSharedMetadata {
    pub volume: Decimal,
}
