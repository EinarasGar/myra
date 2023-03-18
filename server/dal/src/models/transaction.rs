use sqlx::types::{Decimal, Uuid};
use time::PrimitiveDateTime;

#[derive(Clone)]
pub struct TransactionModel {
    pub id: i32,
    pub user_id: Uuid,
    pub group_id: Uuid,
    pub asset_id: i32,
    pub category_id: i32,
    pub quantity: Decimal,
    pub date: PrimitiveDateTime,
}
