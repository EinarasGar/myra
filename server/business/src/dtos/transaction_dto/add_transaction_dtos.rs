use dal::models::transaction_models::{AddTransactionModel, TransactionWithGroupModel};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddUpdateTransactionGroupDto {
    pub id: Option<Uuid>,
    pub transactions: Vec<AddUpdateTransactonDto>,
    pub description: String,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddUpdateTransactonDto {
    pub id: Option<i32>,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub account_id: Option<Uuid>,
    pub description: Option<String>,
}

impl AddUpdateTransactonDto {
    pub fn compare_full(&self, other: &TransactionWithGroupModel) -> bool {
        self.account_id.is_some_and(|x| x == other.account_id)
            && self.id.is_some_and(|x| x == other.id)
            && self.description == other.description
            && self.asset_id == other.asset_id
            && self.quantity == other.quantity
            && self.category == other.category_id
            && self.date == other.date
    }

    pub fn compare_core(&self, other: &TransactionWithGroupModel) -> bool {
        self.account_id.is_some_and(|x| x == other.account_id)
            && self.asset_id == other.asset_id
            && self.quantity == other.quantity
            && self.category == other.category_id
            && self.date == other.date
    }
}
