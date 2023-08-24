use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPair {
    pub pair1: i32,
    pub pair2: i32,
}
