use dal::models::portfolio_models::{
    PortfolioAccountIdNameModel, PortfolioAccountModel, PortfolioCombined,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::asset_dto::AssetDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioDto {
    pub asset: AssetDto,
    pub account: PortfolioAccountDto,
    pub sum: Decimal,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioAccountDto {
    pub account_id: Option<Uuid>,
    pub account_name: String,
}

impl From<PortfolioAccountModel> for PortfolioAccountDto {
    fn from(p: PortfolioAccountModel) -> Self {
        Self {
            account_id: Some(p.id),
            account_name: p.name,
        }
    }
}

impl From<PortfolioAccountIdNameModel> for PortfolioAccountDto {
    fn from(p: PortfolioAccountIdNameModel) -> Self {
        Self {
            account_id: Some(p.id),
            account_name: p.name,
        }
    }
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
            account: PortfolioAccountDto {
                account_id: Some(p.account_id),
                account_name: p.account_name,
            },
            sum: p.sum,
        }
    }
}
