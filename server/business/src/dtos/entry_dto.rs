use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct EntryDto {
    pub entry_id: Option<i32>,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub account_id: Uuid,
}
