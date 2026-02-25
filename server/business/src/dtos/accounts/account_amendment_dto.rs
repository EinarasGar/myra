use rust_decimal::Decimal;

pub struct AccountAmendmentDto {
    pub account_type: i32,
    pub account_name: String,
    pub account_liquidity_type: i32,
    pub ownership_share: Decimal,
}
