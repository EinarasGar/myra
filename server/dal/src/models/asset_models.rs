use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Asset {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetRaw {
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub id: i32,
}
