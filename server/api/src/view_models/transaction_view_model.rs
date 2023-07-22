use business::dtos::transaction_dto::get_transaction_dtos::TransactonDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

use super::portfolio_account_view_model::PortfolioAccountViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionViewModel {
    pub id: i32,
    pub asset_id: i32,

    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub quantity: Decimal,
    pub category_id: i32,

    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub account: PortfolioAccountViewModel,
    pub description: Option<String>,
}

impl From<TransactonDto> for TransactionViewModel {
    fn from(p: TransactonDto) -> Self {
        Self {
            id: p.transaction_id,
            asset_id: p.asset_id,
            quantity: p.quantity,
            category_id: p.category,
            date: p.date,
            description: p.description,
            account: PortfolioAccountViewModel {
                id: p.account.account_id,
                name: p.account.account_name,
            },
        }
    }
}
impl From<TransactionViewModel> for TransactonDto {
    fn from(p: TransactionViewModel) -> Self {
        Self {
            asset_id: p.asset_id,
            quantity: p.quantity,
            category: p.category_id,
            date: p.date,
            description: p.description,
            transaction_id: p.id,
            account: p.account.into(),
        }
    }
}
