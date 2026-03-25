use rust_decimal::Decimal;
use sqlx::types::time::OffsetDateTime;
use sqlx::types::Uuid;

#[derive(sqlx::FromRow, Debug)]
pub struct AiTransactionSearchModel {
    pub transaction_id: Uuid,
    pub description: String,
    pub date_transacted: OffsetDateTime,
    pub quantity: Decimal,
    pub asset_name: String,
    pub account_name: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AiAccountModel {
    pub account_id: Uuid,
    pub account_name: String,
    pub account_type: String,
    pub liquidity_type: String,
    pub active: bool,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AiCategoryModel {
    pub id: i32,
    pub category: String,
    pub category_type: String,
    pub icon: Option<String>,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AiAssetModel {
    pub id: i32,
    pub asset_name: String,
    pub ticker: Option<String>,
    pub asset_type: String,
}
