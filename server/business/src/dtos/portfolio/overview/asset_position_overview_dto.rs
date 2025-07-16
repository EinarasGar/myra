use rust_decimal::Decimal;
use time::OffsetDateTime;

#[derive(Debug)]
pub struct PortfolioAssetOverviewPositionDto {
    pub add_price: Decimal,
    pub quantity_added: Decimal,
    pub add_date: OffsetDateTime,
    pub fees: Decimal,
    pub amount_sold: Decimal,
    pub sale_proceeds: Decimal,
    pub is_dividend: bool,
    pub unit_cost_basis: Decimal,
    pub total_cost_basis: Decimal,
    pub realized_gains: Decimal,
    pub unrealized_gains: Decimal,
    pub total_gains: Decimal,
    pub amount_left: Decimal,
}
