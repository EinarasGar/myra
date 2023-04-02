use dal::models::transaction_models::TransactionModel;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactonDto {
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub description: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactonDto {
    pub transaction_id: i32,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub description: Option<String>,
}

impl From<TransactionModel> for TransactonDto {
    fn from(p: TransactionModel) -> Self {
        Self {
            transaction_id: p.id,
            asset_id: p.asset_id,
            quantity: p.quantity,
            category: p.category_id,
            date: p.date,
            description: p.description,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactionGroupDto {
    pub transactions: Vec<AddTransactonDto>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupDto {
    pub transactions: Vec<TransactonDto>,
    pub description: Option<String>,
}
