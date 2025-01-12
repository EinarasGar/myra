pub mod account_asset_portfolio;
pub mod account_cash_portfolio;
pub mod account_portfolio;
pub mod portfolio_asset_position_dto;

use std::collections::HashMap;

use uuid::Uuid;

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
}

pub trait PortfolioAction {
    fn update_porfolio(&self, portfolio: &mut Portfolio);
    fn date(&self) -> time::OffsetDateTime;
}
