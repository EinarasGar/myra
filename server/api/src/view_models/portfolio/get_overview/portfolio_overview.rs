use business::dtos::portfolio::overview::{PortfolioOverviewDto, PortfolioOverviewType};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{asset_portfolio::AssetPortfolioViewModel, cash_portfolio::CashPortfolioViewModel};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioOverviewViewModel {
    pub cash_portfolios: Vec<CashPortfolioViewModel>,
    pub asset_portfolios: Vec<AssetPortfolioViewModel>,
}

impl From<PortfolioOverviewDto> for PortfolioOverviewViewModel {
    fn from(dto: PortfolioOverviewDto) -> Self {
        let mut cash_portfolios = Vec::new();
        let mut asset_portfolios = Vec::new();
        for portfolio in dto.portfolios {
            match portfolio {
                PortfolioOverviewType::Asset(asset) => asset_portfolios.push(asset.into()),
                PortfolioOverviewType::Cash(cash) => cash_portfolios.push(cash.into()),
            }
        }
        asset_portfolios.sort_by(|a: &AssetPortfolioViewModel, b: &AssetPortfolioViewModel| {
            let a_max = a.positions.iter().map(|p| p.add_date).max();
            let b_max = b.positions.iter().map(|p| p.add_date).max();
            b_max.cmp(&a_max)
        });

        Self {
            cash_portfolios,
            asset_portfolios,
        }
    }
}
