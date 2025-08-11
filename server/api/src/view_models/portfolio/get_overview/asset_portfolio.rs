use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
use crate::view_models::assets::base_models::asset_id::RequiredAssetId;
use business::dtos::portfolio::overview::asset_overview_dto::PortfolioAssetOverviewDto;
use itertools::Itertools;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_portfolio_position::AssetPortfolioPositionViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetPortfolioViewModel {
    pub asset_id: RequiredAssetId,
    pub account_id: RequiredAccountId,
    pub positions: Vec<AssetPortfolioPositionViewModel>,
    pub cash_dividends: Decimal,
    pub total_units: Decimal,
    pub total_fees: Decimal,
    pub realized_gains: Decimal,
    pub unrealized_gains: Decimal,
    pub total_gains: Decimal,
    pub total_cost_basis: Decimal,
    pub unit_cost_basis: Decimal,
}

impl From<PortfolioAssetOverviewDto> for AssetPortfolioViewModel {
    fn from(dto: PortfolioAssetOverviewDto) -> Self {
        Self {
            asset_id: RequiredAssetId(dto.asset_id),
            account_id: RequiredAccountId(dto.account_id),
            positions: dto.positions.into_iter().map_into().collect_vec(),
            cash_dividends: dto.cash_dividends,
            total_units: dto.total_units,
            total_fees: dto.total_fees,
            realized_gains: dto.realized_gains,
            unrealized_gains: dto.unrealized_gains,
            total_gains: dto.total_gains,
            total_cost_basis: dto.total_cost_basis,
            unit_cost_basis: dto.unit_cost_basis,
        }
    }
}
