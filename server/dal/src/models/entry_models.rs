use sqlx::types::{Decimal, Uuid};

#[derive(Debug)]
pub struct AddEntryModel {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub category_id: i32,
    pub transaction_id: Uuid,
}
