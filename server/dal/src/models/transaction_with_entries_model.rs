use sqlx::types::{time::OffsetDateTime, Decimal, Uuid};

#[derive(sqlx::FromRow)]
pub struct TransactionWithEntriesModel {
    pub id: i32,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub category_id: i32,
    pub transaction_id: Uuid,
    pub user_id: Uuid,
    pub type_id: i32,
    pub date: OffsetDateTime,
}
