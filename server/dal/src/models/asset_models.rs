use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Asset {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct InsertAsset {
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub base_pair_id: Option<i32>,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetId {
    pub id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairId {
    pub id: i32,
}
