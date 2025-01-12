use sqlx::types::{time::OffsetDateTime, Decimal, Uuid};

#[derive(Debug)]
pub struct AddEntryModel {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub category_id: i32,
    pub transaction_id: Uuid,
}

#[derive(Debug, sqlx::FromRow)]
pub struct EntriesAssetIntervalSum {
    pub asset_id: i32,
    pub sum: Decimal,
    pub start_time: OffsetDateTime,
}

#[derive(Debug, sqlx::FromRow)]
pub struct EntriesAssetSum {
    pub asset_id: i32,
    pub sum: Decimal,
}
