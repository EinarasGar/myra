use dal::models::transaction_models::{AddTransactionModel, TransactionWithGroupModel};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

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
    pub link_id: Option<Uuid>,
}

impl AddUpdateTransactonDto {
    pub fn compare_full(&self, _other: &TransactionWithGroupModel) -> bool {
        unimplemented!();
        // self.account_id.is_some_and(|x| x == other.account_id)
        //     && self.id.is_some_and(|x| x == other.id)
        //     && self.description == other.description
        //     && self.asset_id == other.asset_id
        //     && self.quantity == other.quantity
        //     && self.category == other.category_id
        //     && self.date == other.date
        //     && self.link_id == other.portfolio_event_id
    }

    pub fn compare_core(&self, _other: &TransactionWithGroupModel) -> bool {
        unimplemented!();

        // self.account_id.is_some_and(|x| x == other.account_id)
        //     && self.asset_id == other.asset_id
        //     && self.quantity == other.quantity
        //     && self.category == other.category_id
        //     && self.date == other.date
        //     && self.link_id == other.portfolio_event_id
    }

    pub fn into_model(self, _user_id: Uuid, _group_id: Uuid) -> AddTransactionModel {
        unimplemented!();
        // AddUpdateTransactionModel {
        //     user_id,
        //     group_id,
        //     asset_id: self.asset_id,
        //     category_id: self.category,
        //     quantity: self.quantity,
        //     date: self.date,
        //     account_id: match self.account_id {
        //         Some(acc) => acc,
        //         None => user_id,
        //     },
        //     portfolio_event_id: self.link_id,
        // }
    }
}
