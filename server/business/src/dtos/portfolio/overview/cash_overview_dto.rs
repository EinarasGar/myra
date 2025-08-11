use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Debug)]
pub struct PortfolioCashOverviewDto {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
    pub dividends: Decimal,
}
