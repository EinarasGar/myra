use business::dtos::portfolio::overview::cash_overview_dto::PortfolioCashOverviewDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CashPortfolioViewModel {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
    pub dividends: Decimal,
}

impl From<PortfolioCashOverviewDto> for CashPortfolioViewModel {
    fn from(dto: PortfolioCashOverviewDto) -> Self {
        Self {
            asset_id: dto.asset_id,
            account_id: dto.account_id,
            units: dto.units,
            fees: dto.fees,
            dividends: dto.dividends,
        }
    }
}
