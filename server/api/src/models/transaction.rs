use std::collections::HashMap;

use business::models::transactions::TransactonDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use uuid::Uuid;

use super::assets::AssetRespData;

pub type TranscationGroupReqData = business::models::transactions::AddTransactionGroupDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionRespData {
    pub transaction_id: i32,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
    pub description: Option<String>,
}

impl From<TransactonDto> for TransactionRespData {
    fn from(p: TransactonDto) -> Self {
        Self {
            transaction_id: p.transaction_id,
            asset_id: p.asset_id,
            quantity: p.quantity,
            category: p.category,
            date: p.date,
            description: p.description,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupRespData {
    pub transactions: Vec<TransactionRespData>,
    pub group_description: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupListRespData {
    pub groups: HashMap<Uuid, TransactionGroupRespData>,
    pub assets_lookup_table: Vec<AssetRespData>,
}
