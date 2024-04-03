use business::dtos::portfolio_overview_dto::{PortfolioOverviewDto, PortfolioOverviewType};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;
use uuid::Uuid;

// TODO: Split this file and clean it up to return correct data.

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioOverviewViewModel {
    pub asset: Vec<PortfolioAssetOverviewViewModel>,
    pub cash: Vec<PortfolioCashOverviewViewModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioCashOverviewViewModel {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
    pub dividends: Decimal,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioAssetOverviewViewModel {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub positions: Vec<PortfolioAssetOverviewPositionViewModel>,
    pub cash_dividends: Decimal,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioAssetOverviewPositionViewModel {
    pub add_price: Decimal,
    pub quantity_added: Decimal,
    #[serde(with = "timestamp")]
    pub add_date: OffsetDateTime,
    pub fees: Decimal,
    pub amount_sold: Decimal,
    pub sale_proceeds: Decimal,
    pub is_dividend: bool,
}

impl From<PortfolioOverviewDto> for PortfolioOverviewViewModel {
    fn from(portfolio_overview_dto: PortfolioOverviewDto) -> Self {
        let mut cash_portfolios: Vec<PortfolioCashOverviewViewModel> = vec![];
        let mut asset_portfolios: Vec<PortfolioAssetOverviewViewModel> = vec![];

        for portfolio in portfolio_overview_dto.portfolios {
            match portfolio {
                PortfolioOverviewType::Asset(asset_portfolio) => {
                    asset_portfolios.push(PortfolioAssetOverviewViewModel {
                        asset_id: asset_portfolio.asset_id,
                        account_id: asset_portfolio.account_id,
                        positions: asset_portfolio
                            .positions
                            .into_iter()
                            .map(|position| PortfolioAssetOverviewPositionViewModel {
                                add_price: position.add_price,
                                quantity_added: position.quantity_added,
                                add_date: position.add_date,
                                fees: position.fees,
                                amount_sold: position.amount_sold,
                                sale_proceeds: position.sale_proceeds,
                                is_dividend: position.is_dividend,
                            })
                            .collect(),
                        cash_dividends: asset_portfolio.cash_dividends,
                    })
                }
                PortfolioOverviewType::Cash(cash_portfolio) => {
                    cash_portfolios.push(PortfolioCashOverviewViewModel {
                        asset_id: cash_portfolio.asset_id,
                        account_id: cash_portfolio.account_id,
                        units: cash_portfolio.units,
                        fees: cash_portfolio.fees,
                        dividends: cash_portfolio.dividends,
                    })
                }
            }
        }

        Self {
            asset: asset_portfolios,
            cash: cash_portfolios,
        }
    }
}
