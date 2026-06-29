use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct AccountIdentifierResult {
    pub kind: String,
    pub value: String,
}

#[derive(Serialize)]
pub struct AccountResult {
    pub account_id: Uuid,
    pub account_name: String,
    pub account_type: String,
    pub liquidity_type: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub ownership_share: Decimal,
    pub identifiers: Vec<AccountIdentifierResult>,
}
