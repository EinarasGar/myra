use dal::models::transaction_models::TransactionWithGroupModel;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use super::portfolio_account_dto::PortfolioAccountDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactonDto {
    pub transaction_id: i32,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub account: PortfolioAccountDto,
    pub description: Option<String>,
    pub link_id: Option<Uuid>,
}

impl From<TransactionWithGroupModel> for TransactonDto {
    fn from(p: TransactionWithGroupModel) -> Self {
        Self {
            transaction_id: p.id,
            asset_id: p.asset_id,
            quantity: p.quantity,
            category: p.category_id,
            date: p.date,
            description: p.description,
            account: PortfolioAccountDto {
                account_id: Some(p.account_id),
                account_name: p.account_name,
            },
            link_id: p.link_id,
        }
    }
}
