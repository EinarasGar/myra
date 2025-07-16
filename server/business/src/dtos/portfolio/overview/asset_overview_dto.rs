use rust_decimal::Decimal;
use uuid::Uuid;

use super::asset_position_overview_dto::PortfolioAssetOverviewPositionDto;

#[derive(Debug)]
pub struct PortfolioAssetOverviewDto {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub positions: Vec<PortfolioAssetOverviewPositionDto>,
    pub cash_dividends: Decimal,
    pub total_units: Decimal,
    pub total_fees: Decimal,
    pub realized_gains: Decimal,
    pub unrealized_gains: Decimal,
    pub total_gains: Decimal,
    pub total_cost_basis: Decimal,
    pub unit_cost_basis: Decimal,
}
