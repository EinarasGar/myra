use business::dtos::portfolio::overview::cash_overview_dto::PortfolioCashOverviewDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
use crate::view_models::assets::base_models::asset_id::RequiredAssetId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CashPortfolioViewModel {
    pub asset_id: RequiredAssetId,
    pub account_id: RequiredAccountId,
    pub units: Decimal,
    pub fees: Decimal,
    pub dividends: Decimal,
}

impl From<PortfolioCashOverviewDto> for CashPortfolioViewModel {
    fn from(dto: PortfolioCashOverviewDto) -> Self {
        Self {
            asset_id: RequiredAssetId(dto.asset_id),
            account_id: RequiredAccountId(dto.account_id),
            units: dto.units,
            fees: dto.fees,
            dividends: dto.dividends,
        }
    }
}
