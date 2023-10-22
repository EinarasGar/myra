use business::dtos::add_update_transaction_dto::AddUpdateTransactonDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

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

impl AddTransactonViewModel {
    pub fn into_dto(self) -> AddUpdateTransactonDto {
        AddUpdateTransactonDto {
            asset_id: self.asset_id,
            quantity: self.quantity,
            category: self.category_id,
            date: self.date,
            account_id: self.account_id,
            description: self.description,
            id: None,
            link_id: None,
        }
    }

    pub fn into_linked_dto(self, link_id: Uuid) -> AddUpdateTransactonDto {
        AddUpdateTransactonDto {
            asset_id: self.asset_id,
            quantity: self.quantity,
            category: self.category_id,
            date: self.date,
            account_id: self.account_id,
            description: self.description,
            id: None,
            link_id: Some(link_id),
        }
    }
}
