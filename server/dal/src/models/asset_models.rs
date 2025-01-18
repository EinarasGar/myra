use sqlx::types::{time::OffsetDateTime, Decimal, Uuid};

#[derive(sqlx::FromRow, Debug)]
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

#[derive(Clone, sqlx::FromRow, Debug)]
pub struct Asset {
    pub id: i32,
    pub asset_name: String,
    pub asset_type: i32,
    pub ticker: String,
    pub user_id: Option<Uuid>,
    pub asset_type_name: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AssetRaw {
    pub ticker: String,
    pub asset_name: String,
    pub asset_type: i32,
    pub id: i32,
    pub base_pair_id: Option<i32>,
    pub user_id: Option<Uuid>,
}

#[derive(sqlx::FromRow, Debug)]
pub struct PublicAsset {
    pub ticker: String,
    pub asset_name: String,
    pub category: String,
    pub id: i32,
}

pub struct InsertAsset {
    pub ticker: String,
    pub asset_name: String,
    pub asset_type: i32,
    pub base_pair_id: Option<i32>,
    pub user_id: Option<Uuid>,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AssetId {
    pub id: i32,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AssetPairId {
    pub id: i32,
}

pub struct AssetPairDate {
    pub pair1: i32,
    pub pair2: i32,
    pub date: OffsetDateTime,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AssetPairRateOption {
    pub pair1: i32,
    pub pair2: i32,
    pub rate: Option<Decimal>,
    pub date: Option<OffsetDateTime>,
}

#[derive(sqlx::FromRow, Debug, Clone)]
pub struct AssetPairRate {
    pub pair1: i32,
    pub pair2: i32,
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}

#[derive(sqlx::FromRow, Debug, Clone)]
pub struct AssetPairRateDate {
    pub pair1: i32,
    pub pair2: i32,
    pub avg_rate: Decimal,
    pub binned_date: OffsetDateTime,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AssetPairSharedMetadata {
    pub volume: Decimal,
}

pub struct AssetPair {
    pub pair1: i32,
    pub pair2: i32,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AssetRate {
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}

pub struct AssetPairRateInsert {
    pub pair_id: i32,
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}
