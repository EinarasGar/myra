use serde::{Deserialize, Serialize};
use sqlx::types::{time::OffsetDateTime, Decimal, Uuid};

#[derive(sqlx::FromRow)]
pub struct AssetWithMetadata {
    pub id: i32,
    pub asset_name: String,
    pub asset_type: i32,
    pub ticker: String,
    pub user_id: Option<Uuid>,
    pub base_pair_id: i32,
    pub asset_type_name: String,
    pub pairs: Option<Vec<i32>>,
}

#[derive(Clone, sqlx::FromRow)]
pub struct Asset {
    pub id: i32,
    pub asset_name: String,
    pub asset_type: i32,
    pub ticker: String,
    pub user_id: Option<Uuid>,
    pub asset_type_name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetRaw {
    pub ticker: String,
    pub asset_name: String,
    pub asset_type: i32,
    pub id: i32,
    pub base_pair_id: Option<i32>,
    pub user_id: Option<Uuid>,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PublicAsset {
    pub ticker: String,
    pub asset_name: String,
    pub category: String,
    pub id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct InsertAsset {
    pub ticker: String,
    pub asset_name: String,
    pub asset_type: i32,
    pub base_pair_id: Option<i32>,
    pub user_id: Option<Uuid>,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetId {
    pub id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairId {
    pub id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairDate {
    pub pair1: i32,
    pub pair2: i32,
    pub date: OffsetDateTime,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairRateOption {
    pub pair1: i32,
    pub pair2: i32,
    pub rate: Option<Decimal>,
    pub date: Option<OffsetDateTime>,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairRate {
    pub pair1: i32,
    pub pair2: i32,
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairSharedMetadata {
    pub volume: Decimal,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPair {
    pub pair1: i32,
    pub pair2: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetRate {
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetPairRateInsert {
    pub pair_id: i32,
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}
