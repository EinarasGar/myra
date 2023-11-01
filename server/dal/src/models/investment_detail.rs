use sqlx::{
    types::{time::OffsetDateTime, Decimal, Uuid},
    FromRow,
};

use super::transaction_category_type::TransactionCategoryType;

#[derive(FromRow, Debug, Clone)]
pub struct InvestmentDetailModel {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    #[sqlx(rename = "type")]
    pub category_type: Option<TransactionCategoryType>,
    pub link_id: Uuid,
    pub date: OffsetDateTime,
}
