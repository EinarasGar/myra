use business::dtos::transaction_dto::add_transaction_dtos::AddUpdateTransactonDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UpdateTransactonViewModel {
    pub id: Option<i32>,
    pub asset_id: i32,

    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub quantity: Decimal,
    pub category_id: i32,

    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub account_id: Option<Uuid>,
    pub description: Option<String>,
}

impl From<UpdateTransactonViewModel> for AddUpdateTransactonDto {
    fn from(p: UpdateTransactonViewModel) -> Self {
        Self {
            asset_id: p.asset_id,
            quantity: p.quantity,
            category: p.category_id,
            date: p.date,
            account_id: p.account_id,
            description: p.description,
            id: p.id,
        }
    }
}
