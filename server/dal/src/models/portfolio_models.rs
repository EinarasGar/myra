use sqlx::types::{Decimal, Uuid};

#[derive(sqlx::FromRow, Debug)]
pub struct Holding {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub total_quantity: Decimal,
}
