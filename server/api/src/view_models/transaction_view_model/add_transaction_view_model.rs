use business::dtos::transaction_dto::add_transaction_dtos::{
    AddTransactionGroupDto, AddTransactonDto,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactionGroupViewModel {
    pub transactions: Vec<AddTransactonViewModel>,
    pub description: String,
    pub category_id: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddTransactonViewModel {
    pub asset_id: i32,

    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub quantity: Decimal,
    pub category_id: i32,

    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub account_id: Option<Uuid>,
    pub description: Option<String>,
}

impl From<AddTransactionGroupViewModel> for AddTransactionGroupDto {
    fn from(p: AddTransactionGroupViewModel) -> Self {
        Self {
            transactions: p
                .transactions
                .iter()
                .map(|val| val.clone().into())
                .collect(),
            description: p.description,
            category: p.category_id,
            date: p.date,
        }
    }
}

impl From<AddTransactonViewModel> for AddTransactonDto {
    fn from(p: AddTransactonViewModel) -> Self {
        Self {
            asset_id: p.asset_id,
            quantity: p.quantity,
            category: p.category_id,
            date: p.date,
            account_id: p.account_id,
            description: p.description,
        }
    }
}
