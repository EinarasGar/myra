use business::dtos::transaction_dto::get_transaction_dtos::{TransactionGroupDto, TransactonDto};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use crate::view_models::{
    asset_view_model::AssetViewModel, portfolio_view_model::PortfolioAccountViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupListRespData {
    pub groups: Vec<TransactionGroupRespData>,
    pub assets_lookup_table: Vec<AssetViewModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupRespData {
    pub transactions: Vec<TransactionRespData>,
    pub description: String,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub category_id: i32,
    pub id: Uuid,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionRespData {
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

impl From<TransactonDto> for TransactionRespData {
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

impl From<TransactionGroupDto> for TransactionGroupRespData {
    fn from(p: TransactionGroupDto) -> Self {
        Self {
            transactions: p
                .transactions
                .into_iter()
                .map(|t| TransactionRespData::from(t))
                .collect(),
            description: p.description,
            date: p.date,
            category_id: p.category,
            id: p.group_id,
        }
    }
}
