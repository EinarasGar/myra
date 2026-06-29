use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone)]
pub struct TransactionSearchResult {
    pub transaction_id: Uuid,
    pub description: String,
    pub date_transacted: OffsetDateTime,
    pub quantity: Decimal,
    pub asset_name: String,
    pub account_name: String,
}
