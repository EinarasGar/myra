use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct EntryDto {
    pub entry_id: Option<i32>,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub account_id: Uuid,
}

impl EntryDto {
    pub fn new(asset_id: i32, account_id: Uuid, quantity: Decimal) -> Self {
        Self {
            entry_id: None,
            asset_id,
            quantity,
            account_id,
        }
    }
}
