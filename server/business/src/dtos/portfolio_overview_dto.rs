use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::Portfolio;

// TODO: Split this file and clean it up to return correct data.

pub enum PortfolioOverviewType {
    Asset(PortfolioAssetOverviewDto),
    Cash(PortfolioCashOverviewDto),
}

pub struct PortfolioOverviewDto {
    pub portfolios: Vec<PortfolioOverviewType>,
}

pub struct PortfolioCashOverviewDto {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
    pub dividends: Decimal,
}

pub struct PortfolioAssetOverviewDto {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub positions: Vec<PortfolioAssetOverviewPositionDto>,
    pub cash_dividends: Decimal,
}

pub struct PortfolioAssetOverviewPositionDto {
    pub add_price: Decimal,
    pub quantity_added: Decimal,
    pub add_date: OffsetDateTime,
    pub fees: Decimal,
    pub amount_sold: Decimal,
    pub sale_proceeds: Decimal,
    pub is_dividend: bool,
}

impl From<Portfolio> for PortfolioOverviewDto {
    fn from(portfolio_overview_dto: Portfolio) -> Self {
        let mut portfolios: Vec<PortfolioOverviewType> = vec![];

        for portfolio in portfolio_overview_dto.account_portfolios() {
            for asset_portfolio in &portfolio.1.asset_portfolios {
                portfolios.push(PortfolioOverviewType::Asset(PortfolioAssetOverviewDto {
                    asset_id: asset_portfolio.0.clone(),
                    account_id: portfolio.0.clone(),
                    positions: asset_portfolio
                        .1
                        .positions
                        .clone()
                        .into_iter()
                        .map(|position| PortfolioAssetOverviewPositionDto {
                            add_price: position.add_price(),
                            quantity_added: position.units(),
                            add_date: position.add_date(),
                            fees: position.total_fees(),
                            amount_sold: position.amount_sold(),
                            sale_proceeds: position.get_realized_gains(),
                            is_dividend: position.is_dividend(),
                        })
                        .collect::<Vec<PortfolioAssetOverviewPositionDto>>(),
                    cash_dividends: asset_portfolio.1.cash_dividends(),
                }));
            }
            for cash_portfolio in &portfolio.1.cash_portfolios {
                portfolios.push(PortfolioOverviewType::Cash(PortfolioCashOverviewDto {
                    asset_id: cash_portfolio.0.clone(),
                    account_id: portfolio.0.clone(),
                    units: cash_portfolio.1.units(),
                    fees: cash_portfolio.1.fees(),
                    dividends: cash_portfolio.1.dividends(),
                }));
            }
        }

        Self { portfolios }
    }
}
