use dal::models::portfolio_models::PortfolioCombined;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use super::asset_dto::AssetDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioDto {
    pub asset: AssetDto,
    pub sum: Decimal,
}

impl From<PortfolioCombined> for PortfolioDto {
    fn from(p: PortfolioCombined) -> Self {
        Self {
            asset: AssetDto {
                ticker: p.ticker,
                name: p.name,
                category: p.category,
                asset_id: p.asset_id,
            },
            sum: p.sum,
        }
    }
}
