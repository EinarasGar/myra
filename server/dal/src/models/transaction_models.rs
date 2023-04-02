use sqlx::types::{Decimal, Uuid};
use time::OffsetDateTime;

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct TransactionModel {
    pub id: i32,
    pub user_id: Uuid,
    pub group_id: Uuid,
    pub asset_id: i32,
    pub category_id: i32,
    pub quantity: Decimal,
    pub date: OffsetDateTime,
    pub description: Option<String>,
    pub group_description: Option<String>,
}
