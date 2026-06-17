use rust_decimal::Decimal;

use super::account_identifier_dto::AccountIdentifierDto;

pub struct AccountAmendmentDto {
    pub account_type: i32,
    pub account_name: String,
    pub account_liquidity_type: i32,
    pub ownership_share: Decimal,
    pub identifiers: Vec<AccountIdentifierDto>,
}
