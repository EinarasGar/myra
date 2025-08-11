use business::dtos::portfolio::overview::asset_position_overview_dto::PortfolioAssetOverviewPositionDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::rfc3339, OffsetDateTime};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetPortfolioPositionViewModel {
    pub add_price: Decimal,
    pub quantity_added: Decimal,

    #[serde(with = "rfc3339")]
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

impl From<PortfolioAssetOverviewPositionDto> for AssetPortfolioPositionViewModel {
    fn from(dto: PortfolioAssetOverviewPositionDto) -> Self {
        Self {
            add_price: dto.add_price,
            quantity_added: dto.quantity_added,
            add_date: dto.add_date,
            fees: dto.fees,
            amount_sold: dto.amount_sold,
            sale_proceeds: dto.sale_proceeds,
            is_dividend: dto.is_dividend,
            unit_cost_basis: dto.unit_cost_basis,
            total_cost_basis: dto.total_cost_basis,
            realized_gains: dto.realized_gains,
            unrealized_gains: dto.unrealized_gains,
            total_gains: dto.total_gains,
            amount_left: dto.amount_left,
        }
    }
}
