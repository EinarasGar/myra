use dal::models::{
    transaction_models::TransactionFinancials,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionFinancialsDto {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub date: OffsetDateTime,
}

impl From<TransactionFinancials> for TransactionFinancialsDto {
    fn from(p: TransactionFinancials) -> Self {
        Self {
            account_id: p.account_id,
            asset_id: p.asset_id,
            date: p.date,
            quantity: p.quantity,
        }
    }
}
