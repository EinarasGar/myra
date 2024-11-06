use dal::models::add_entry_model::AddEntryModel;
use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct Entry {
    pub entry_id: Option<i32>,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub account_id: Uuid,
    pub category: i32,
}

impl Entry {
    pub fn get_add_entry_model(&self, transaction_id: Uuid) -> AddEntryModel {
        AddEntryModel {
            asset_id: self.asset_id,
            quantity: self.quantity,
            account_id: self.account_id,
            category_id: self.category,
            transaction_id,
        }
    }

    pub fn set_entry_id(&mut self, entry_id: i32) {
        self.entry_id = Some(entry_id);
    }
}
