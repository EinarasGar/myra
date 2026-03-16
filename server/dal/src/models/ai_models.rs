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
