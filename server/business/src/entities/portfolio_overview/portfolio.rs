pub mod account_asset_portfolio;
pub mod account_cash_portfolio;
pub mod account_portfolio;
pub mod portfolio_asset_position_dto;

use std::{collections::HashMap, fmt::Debug};

use rust_decimal::Decimal;
use uuid::Uuid;

use crate::dtos::{
    assets::asset_id_dto::AssetIdDto,
    portfolio::overview::{
        asset_overview_dto::PortfolioAssetOverviewDto,
        asset_position_overview_dto::PortfolioAssetOverviewPositionDto,
        cash_overview_dto::PortfolioCashOverviewDto, PortfolioOverviewDto, PortfolioOverviewType,
    },
};

use self::{
    account_asset_portfolio::AccountAssetPortfolio, account_cash_portfolio::AccountCashPortfolio,
    account_portfolio::AccountPortfolio,
};

#[derive(Clone, Debug)]
pub struct Portfolio {
    account_portfolios: HashMap<Uuid, AccountPortfolio>,
}

impl Default for Portfolio {
    fn default() -> Self {
        Self::new()
    }
}

impl Portfolio {
    pub fn new() -> Self {
        Self {
            account_portfolios: HashMap::new(),
        }
    }

    #[allow(dead_code)]
    pub fn process_transactions(&mut self, mut transactions: Vec<Box<dyn PortfolioAction>>) {
        transactions.sort_by_key(|a| a.date());

        transactions.into_iter().for_each(|transaction| {
            transaction.update_porfolio(self);
        });

        // filter out any empty asset portfolios
        self.account_portfolios
            .iter_mut()
            .for_each(|(_, account_portfolio)| {
                account_portfolio
                    .asset_portfolios
                    .retain(|_, asset_portfolio| {
                        !asset_portfolio.positions.is_empty()
                            || !asset_portfolio.cash_dividends.is_zero()
                    });
            });

        // filter out any empty cash portfolios
        self.account_portfolios
            .iter_mut()
            .for_each(|(_, account_portfolio)| {
                account_portfolio
                    .cash_portfolios
                    .retain(|_, cash_portfolio| !cash_portfolio.is_empty());
            });
    }

    pub fn get_cash_portfolio(
        &mut self,
        account_id: Uuid,
        asset_id: i32,
    ) -> &mut AccountCashPortfolio {
        self.account_portfolios
            .entry(account_id)
            .or_default()
            .cash_portfolios
            .entry(asset_id)
            .or_default()
    }

    pub fn get_asset_portfolio(
        &mut self,
        account_id: Uuid,
        asset_id: i32,
    ) -> &mut AccountAssetPortfolio {
        self.account_portfolios
            .entry(account_id)
            .or_default()
            .asset_portfolios
            .entry(asset_id)
            .or_default()
    }

    #[allow(dead_code)]
    pub fn account_portfolios(&self) -> &HashMap<Uuid, AccountPortfolio> {
        &self.account_portfolios
    }

    pub fn try_into_dto(
        &self,
        current_rates: HashMap<AssetIdDto, Decimal>,
    ) -> anyhow::Result<PortfolioOverviewDto> {
        let mut portfolios = Vec::new();
        self.account_portfolios()
            .iter()
            .for_each(|(account_id, account_portfolio)| {
                account_portfolio.asset_portfolios.iter().for_each(
                    |(asset_id, asset_portfolio)| {
                        let current_rate = current_rates.get(&AssetIdDto(*asset_id)).unwrap();
                        portfolios.push(PortfolioOverviewType::Asset(PortfolioAssetOverviewDto {
                            asset_id: *asset_id,
                            account_id: *account_id,
                            positions: asset_portfolio
                                .positions
                                .iter()
                                .map(|p| PortfolioAssetOverviewPositionDto {
                                    add_price: p.add_price(),
                                    quantity_added: p.units(),
                                    add_date: p.add_date(),
                                    fees: p.total_fees(),
                                    amount_sold: p.amount_sold(),
                                    sale_proceeds: p.sale_proceeds(),
                                    is_dividend: p.is_dividend(),
                                    unit_cost_basis: p.get_unit_cost_basis(),
                                    total_cost_basis: p.get_total_cost_basis(),
                                    realized_gains: p.get_realized_gains(),
                                    unrealized_gains: p.get_unrealized_gains(*current_rate),
                                    total_gains: p.get_total_gains(*current_rate),
                                    amount_left: p.get_amount_left(),
                                })
                                .collect(),
                            cash_dividends: asset_portfolio.cash_dividends(),
                            total_units: asset_portfolio.units(),
                            total_fees: asset_portfolio.total_fees(),
                            realized_gains: asset_portfolio.realized_gains(),
                            unrealized_gains: asset_portfolio.unrealized_gains(*current_rate),
                            total_gains: asset_portfolio.total_gains(*current_rate),
                            total_cost_basis: asset_portfolio.total_cost_basis(),
                            unit_cost_basis: asset_portfolio.get_unit_cost_basis(),
                        }));
                    },
                );
                account_portfolio
                    .cash_portfolios
                    .iter()
                    .for_each(|(asset_id, cash_portfolio)| {
                        portfolios.push(PortfolioOverviewType::Cash(PortfolioCashOverviewDto {
                            asset_id: *asset_id,
                            account_id: *account_id,
                            units: cash_portfolio.units(),
                            fees: cash_portfolio.fees(),
                            dividends: cash_portfolio.dividends(),
                        }));
                    });
            });
        Ok(PortfolioOverviewDto {
            portfolios,
        })
    }
}

pub trait PortfolioAction: Debug + Send {
    fn update_porfolio(&self, portfolio: &mut Portfolio);
    fn date(&self) -> time::OffsetDateTime;
}

pub trait ReferentialPortfolioAction: PortfolioAction {
    fn apply_referential_price(&mut self, price: Decimal);
    fn get_cash_asset_id(&self) -> AssetIdDto;
}
