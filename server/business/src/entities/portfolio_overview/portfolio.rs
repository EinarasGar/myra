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

        // filter out any empty account portfolios
        self.account_portfolios.retain(|_, account_portfolio| {
            !account_portfolio.asset_portfolios.is_empty()
                || !account_portfolio.cash_portfolios.is_empty()
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

    pub fn retain_account(&mut self, account_id: Uuid) {
        self.account_portfolios.retain(|id, _| *id == account_id);
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
                        // A held asset with no current rate is left out of the
                        // overview rather than crashing it (mirrors net-worth
                        // history dropping unpriced holdings). Its gains/value can't
                        // be expressed in the reference asset without a rate.
                        let Some(current_rate) = current_rates.get(&AssetIdDto(*asset_id)) else {
                            tracing::warn!(
                                asset_id = %asset_id,
                                account_id = %account_id,
                                "held asset has no current rate, omitting from overview"
                            );
                            return;
                        };
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
                            remaining_units: asset_portfolio.remaining_units(),
                            market_value: asset_portfolio.market_value(*current_rate),
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
        Ok(PortfolioOverviewDto { portfolios })
    }
}

pub trait PortfolioAction: Debug + Send {
    fn update_porfolio(&self, portfolio: &mut Portfolio);
    fn date(&self) -> time::OffsetDateTime;
}

pub trait ReferentialPortfolioAction: PortfolioAction {
    fn apply_conversion_rate(&mut self, price: Decimal);
    fn get_conversion_asset_id(&self) -> AssetIdDto;
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;
    use uuid::Uuid;

    use crate::entities::portfolio_overview::investment_transaction::{
        asset_balance_transfer::AssetBalanceTransfer, asset_purchase::AssetPurchase,
        asset_sale::AssetSale, asset_transfer_in::AssetTransferIn,
        cash_balance_transfer::CashBalanceTransfer, cash_dividend::CashDividend,
        cash_transfer_in::CashTransferIn, cash_transfer_out::CashTransferOut,
    };

    use super::*;

    #[test]
    fn process_transactions_replays_in_chronological_order_regardless_of_input_order() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(5),
                instrument_reference_price: dec!(150),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(750),
                date: datetime!(2000-03-01 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(10),
                instrument_price: dec!(200),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(2000),
                date: datetime!(2000-02-01 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(10),
                instrument_price: dec!(100),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(1000),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio should exist");

        assert_eq!(asset_portfolio.positions.len(), 2);

        let oldest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-01-01 00:00:00 UTC))
            .expect("oldest lot should exist");
        let newest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-02-01 00:00:00 UTC))
            .expect("newest lot should exist");

        assert_eq!(oldest.amount_sold(), dec!(5));
        assert_eq!(oldest.get_realized_gains(), dec!(250));
        assert_eq!(newest.amount_sold(), dec!(0));
    }

    #[test]
    fn same_timestamp_purchase_listed_before_sale_replays_in_input_order() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(10),
                instrument_price: dec!(100),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(1000),
                date,
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(5),
                instrument_reference_price: dec!(150),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(750),
                date,
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist");
        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio should exist");

        assert_eq!(asset_portfolio.positions.len(), 1);
        assert_eq!(asset_portfolio.positions[0].amount_sold(), dec!(5));
        assert_eq!(asset_portfolio.positions[0].get_realized_gains(), dec!(250));
        assert_eq!(
            account_portfolio
                .cash_portfolios
                .get(&10)
                .expect("cash portfolio should exist")
                .units(),
            dec!(-250)
        );
    }

    // Open question 2: an oversell currently only logs a warning and still credits the proceeds;
    // this pins today's behavior plus stable-sort tie order (same-timestamp actions replay in input order).
    #[test]
    fn same_timestamp_sale_listed_before_purchase_replays_sale_first() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(5),
                instrument_reference_price: dec!(150),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(750),
                date,
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(10),
                instrument_price: dec!(100),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(1000),
                date,
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist");
        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio should exist");

        assert_eq!(asset_portfolio.positions.len(), 1);
        assert_eq!(asset_portfolio.positions[0].amount_sold(), dec!(0));
        assert_eq!(asset_portfolio.positions[0].units(), dec!(10));
        assert_eq!(
            account_portfolio
                .cash_portfolios
                .get(&10)
                .expect("cash portfolio should exist")
                .units(),
            dec!(-250)
        );
    }

    #[test]
    fn interleaved_accounts_and_assets_stay_independent() {
        let mut portfolio = Portfolio::new();
        let account_a = Uuid::new_v4();
        let account_b = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 100,
                account_id: account_a,
                units: dec!(1000),
                fees: dec!(0),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: 101,
                account_id: account_b,
                units: dec!(500),
                fees: dec!(0),
                date: datetime!(2000-01-02 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_a,
                instrument_units: dec!(3),
                instrument_price: dec!(10),
                fees: dec!(0),
                cash_asset_id: 100,
                cash_units: dec!(30),
                date: datetime!(2000-01-03 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_b,
                instrument_units: dec!(7),
                instrument_price: dec!(20),
                fees: dec!(0),
                cash_asset_id: 101,
                cash_units: dec!(140),
                date: datetime!(2000-01-04 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 2,
                account_id: account_a,
                instrument_units: dec!(4),
                instrument_price: dec!(5),
                fees: dec!(0),
                cash_asset_id: 100,
                cash_units: dec!(20),
                date: datetime!(2000-01-05 00:00:00 UTC),
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id: account_b,
                instrument_units: dec!(2),
                instrument_reference_price: dec!(25),
                fees: dec!(0),
                cash_asset_id: 101,
                cash_units: dec!(50),
                date: datetime!(2000-01-06 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let portfolio_a = portfolio
            .account_portfolios()
            .get(&account_a)
            .expect("account a should exist");
        let portfolio_b = portfolio
            .account_portfolios()
            .get(&account_b)
            .expect("account b should exist");

        assert_eq!(portfolio_a.asset_portfolios.len(), 2);
        let a_asset_1 = portfolio_a
            .asset_portfolios
            .get(&1)
            .expect("account a asset 1 should exist");
        assert_eq!(a_asset_1.units(), dec!(3));
        assert_eq!(a_asset_1.positions[0].amount_sold(), dec!(0));
        let a_asset_2 = portfolio_a
            .asset_portfolios
            .get(&2)
            .expect("account a asset 2 should exist");
        assert_eq!(a_asset_2.units(), dec!(4));
        assert_eq!(portfolio_a.cash_portfolios.len(), 1);
        assert_eq!(
            portfolio_a
                .cash_portfolios
                .get(&100)
                .expect("account a cash 100 should exist")
                .units(),
            dec!(950)
        );

        assert_eq!(portfolio_b.asset_portfolios.len(), 1);
        let b_asset_1 = portfolio_b
            .asset_portfolios
            .get(&1)
            .expect("account b asset 1 should exist");
        assert_eq!(b_asset_1.units(), dec!(7));
        assert_eq!(b_asset_1.positions[0].amount_sold(), dec!(2));
        assert_eq!(portfolio_b.cash_portfolios.len(), 1);
        assert_eq!(
            portfolio_b
                .cash_portfolios
                .get(&101)
                .expect("account b cash 101 should exist")
                .units(),
            dec!(410)
        );
    }

    #[test]
    fn zeroed_cash_portfolio_is_pruned_while_live_cash_remains() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                units: dec!(5),
                fees: dec!(0),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id,
                units: dec!(5),
                fees: dec!(0),
                date: datetime!(2000-01-02 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: 11,
                account_id,
                units: dec!(7),
                fees: dec!(0),
                date: datetime!(2000-01-03 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist");

        assert!(!account_portfolio.cash_portfolios.contains_key(&10));
        assert_eq!(
            account_portfolio
                .cash_portfolios
                .get(&11)
                .expect("live cash portfolio should remain")
                .units(),
            dec!(7)
        );
    }

    #[test]
    fn cash_portfolio_with_zero_balance_but_nonzero_fees_is_retained() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashTransferIn {
            asset_id: 10,
            account_id,
            units: dec!(5),
            fees: dec!(5),
            date: datetime!(2000-01-01 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist")
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio should be retained for its fee total");

        assert_eq!(cash_portfolio.units(), dec!(0));
        assert_eq!(cash_portfolio.fees(), dec!(5));
    }

    #[test]
    fn account_with_all_portfolios_empty_is_pruned() {
        let mut portfolio = Portfolio::new();
        let empty_account = Uuid::new_v4();
        let live_account = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id: empty_account,
                units: dec!(5),
                fees: dec!(0),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id: empty_account,
                units: dec!(5),
                fees: dec!(0),
                date: datetime!(2000-01-02 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id: live_account,
                units: dec!(3),
                fees: dec!(0),
                date: datetime!(2000-01-03 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        assert!(!portfolio.account_portfolios().contains_key(&empty_account));
        assert!(portfolio.account_portfolios().contains_key(&live_account));
        assert_eq!(portfolio.account_portfolios().len(), 1);
    }

    #[test]
    fn asset_portfolio_with_only_cash_dividends_is_retained() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashDividend {
            origin_asset_id: 1,
            asset_id: 10,
            account_id,
            quantity: dec!(5),
            price: dec!(1.2),
            fees: dec!(0),
            date: datetime!(2000-01-01 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist")
            .asset_portfolios
            .get(&1)
            .expect("dividend-paying asset portfolio should be retained");

        assert!(asset_portfolio.positions.is_empty());
        assert_eq!(asset_portfolio.cash_dividends(), dec!(6));
    }

    // Open question 2: selling units that were never held currently logs a warning and proceeds;
    // the empty asset portfolio it creates is pruned.
    #[test]
    fn asset_portfolio_left_empty_by_oversell_is_pruned() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(AssetSale {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(5),
            instrument_reference_price: dec!(150),
            fees: dec!(0),
            cash_asset_id: 10,
            cash_units: dec!(750),
            date: datetime!(2000-01-01 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist");

        assert!(account_portfolio.asset_portfolios.is_empty());
        assert_eq!(
            account_portfolio
                .cash_portfolios
                .get(&10)
                .expect("cash portfolio should exist")
                .units(),
            dec!(750)
        );
    }

    #[test]
    fn get_cash_portfolio_auto_creates_and_returns_persistent_entry() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let cash = portfolio.get_cash_portfolio(account_id, 10);
        assert_eq!(cash.units(), dec!(0));
        assert_eq!(cash.fees(), dec!(0));
        assert_eq!(cash.dividends(), dec!(0));

        cash.add_units(dec!(42));

        assert_eq!(
            portfolio.get_cash_portfolio(account_id, 10).units(),
            dec!(42)
        );
        assert!(portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should be auto-created")
            .cash_portfolios
            .contains_key(&10));
    }

    #[test]
    fn get_asset_portfolio_auto_creates_and_returns_persistent_entry() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let asset = portfolio.get_asset_portfolio(account_id, 1);
        assert!(asset.positions.is_empty());
        assert_eq!(asset.cash_dividends(), dec!(0));

        asset.add_cash_dividends(dec!(3));

        assert_eq!(
            portfolio
                .get_asset_portfolio(account_id, 1)
                .cash_dividends(),
            dec!(3)
        );
        assert!(portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should be auto-created")
            .asset_portfolios
            .contains_key(&1));
    }

    #[test]
    fn retain_account_keeps_only_transfer_destination_and_drops_counterparty() {
        let mut portfolio = Portfolio::new();
        let source = Uuid::new_v4();
        let destination = Uuid::new_v4();

        portfolio.process_transactions(vec![Box::new(CashBalanceTransfer {
            asset_id: 1,
            account_from: source,
            account_to: destination,
            units: dec!(100),
            fees: dec!(0),
            date: datetime!(2000-03-23 00:00:00 UTC),
        })]);

        assert_eq!(portfolio.account_portfolios().len(), 2);

        portfolio.retain_account(destination);

        assert_eq!(portfolio.account_portfolios().len(), 1);
        assert!(portfolio.account_portfolios().contains_key(&destination));
        assert!(!portfolio.account_portfolios().contains_key(&source));
        assert_eq!(
            portfolio
                .account_portfolios()
                .get(&destination)
                .expect("destination account should remain")
                .cash_portfolios
                .get(&1)
                .expect("destination cash should remain")
                .units(),
            dec!(100)
        );
    }

    #[test]
    fn retain_account_keeps_only_transfer_source_and_drops_counterparty() {
        let mut portfolio = Portfolio::new();
        let source = Uuid::new_v4();
        let destination = Uuid::new_v4();

        portfolio.process_transactions(vec![Box::new(CashBalanceTransfer {
            asset_id: 1,
            account_from: source,
            account_to: destination,
            units: dec!(100),
            fees: dec!(0),
            date: datetime!(2000-03-23 00:00:00 UTC),
        })]);

        portfolio.retain_account(source);

        assert_eq!(portfolio.account_portfolios().len(), 1);
        assert!(portfolio.account_portfolios().contains_key(&source));
        assert!(!portfolio.account_portfolios().contains_key(&destination));
        assert_eq!(
            portfolio
                .account_portfolios()
                .get(&source)
                .expect("source account should remain")
                .cash_portfolios
                .get(&1)
                .expect("source cash should remain")
                .units(),
            dec!(-100)
        );
    }

    #[test]
    fn retain_account_with_no_match_clears_all_portfolios() {
        let mut portfolio = Portfolio::new();
        let source = Uuid::new_v4();
        let destination = Uuid::new_v4();

        portfolio.process_transactions(vec![Box::new(CashBalanceTransfer {
            asset_id: 1,
            account_from: source,
            account_to: destination,
            units: dec!(100),
            fees: dec!(0),
            date: datetime!(2000-03-23 00:00:00 UTC),
        })]);

        portfolio.retain_account(Uuid::new_v4());

        assert!(portfolio.account_portfolios().is_empty());
    }

    #[test]
    fn per_account_overview_isolates_each_side_of_transfer_with_prior_balances() {
        let funded = Uuid::new_v4();
        let overdrawn = Uuid::new_v4();

        let prior_funded = || {
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id: funded,
                units: dec!(200),
                fees: dec!(0),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }) as Box<dyn PortfolioAction>
        };
        let prior_overdrawn = || {
            Box::new(CashTransferOut {
                asset_id: 1,
                account_id: overdrawn,
                units: dec!(100),
                fees: dec!(0),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }) as Box<dyn PortfolioAction>
        };
        let transfer = || {
            Box::new(CashBalanceTransfer {
                asset_id: 1,
                account_from: funded,
                account_to: overdrawn,
                units: dec!(50),
                fees: dec!(0),
                date: datetime!(2000-02-01 00:00:00 UTC),
            }) as Box<dyn PortfolioAction>
        };

        let cash = |portfolio: &Portfolio, account: &Uuid| {
            portfolio
                .account_portfolios()
                .get(account)
                .expect("account should exist")
                .cash_portfolios
                .get(&1)
                .expect("cash should exist")
                .units()
        };

        // Each per-account overview query returns that account's own history plus
        // both legs of any transfer it touches, so the counterparty's leg leaks in
        // until retain_account drops every account but the requested one.
        let mut funded_view = Portfolio::new();
        funded_view.process_transactions(vec![prior_funded(), transfer()]);
        assert_eq!(funded_view.account_portfolios().len(), 2);
        funded_view.retain_account(funded);
        assert_eq!(funded_view.account_portfolios().len(), 1);
        assert_eq!(cash(&funded_view, &funded), dec!(150));

        let mut overdrawn_view = Portfolio::new();
        overdrawn_view.process_transactions(vec![prior_overdrawn(), transfer()]);
        assert_eq!(overdrawn_view.account_portfolios().len(), 2);
        overdrawn_view.retain_account(overdrawn);
        assert_eq!(overdrawn_view.account_portfolios().len(), 1);
        assert_eq!(cash(&overdrawn_view, &overdrawn), dec!(-50));
    }

    #[test]
    fn full_replay_then_retain_delivers_transferred_in_asset_to_destination() {
        let mut portfolio = Portfolio::new();
        let source = Uuid::new_v4();
        let destination = Uuid::new_v4();

        portfolio.process_transactions(vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: source,
                quantity: dec!(2),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from: source,
                account_to: destination,
                quantity: dec!(2),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ]);

        portfolio.retain_account(destination);

        assert_eq!(portfolio.account_portfolios().len(), 1);
        assert_eq!(
            portfolio
                .account_portfolios()
                .get(&destination)
                .expect("destination should hold the transferred asset")
                .asset_portfolios
                .get(&1)
                .expect("transferred asset should be present")
                .remaining_units(),
            dec!(2)
        );
    }

    #[test]
    fn same_asset_id_coexists_as_cash_and_asset_portfolio_in_one_account() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 7,
                account_id,
                units: dec!(50),
                fees: dec!(0),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 7,
                account_id,
                instrument_units: dec!(3),
                instrument_price: dec!(10),
                fees: dec!(0),
                cash_asset_id: 7,
                cash_units: dec!(30),
                date: datetime!(2000-01-02 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account should exist");

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&7)
            .expect("cash portfolio under asset id 7 should exist");
        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&7)
            .expect("asset portfolio under asset id 7 should exist");

        assert_eq!(cash_portfolio.units(), dec!(20));
        assert_eq!(asset_portfolio.units(), dec!(3));
        assert_eq!(asset_portfolio.positions.len(), 1);
        assert_eq!(asset_portfolio.positions[0].add_price(), dec!(10));
    }

    // After a partial sale, `total_cost_basis` still covers every unit ever bought while
    // `unrealized_gains` covers only the units still held, so the naive
    // "value = total_cost_basis + unrealized_gains" formula retains the sold
    // units' basis. `market_value` (units still held × latest rate) is the correct current value.
    #[test]
    fn try_into_dto_market_value_excludes_sold_units_unlike_cost_basis_plus_unrealized() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(10),
                instrument_price: dec!(100),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(1000),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(8),
                instrument_reference_price: dec!(120),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(960),
                date: datetime!(2000-02-01 00:00:00 UTC),
            }),
        ];
        portfolio.process_transactions(input);

        let current_rate = dec!(130);
        let mut rates = HashMap::new();
        rates.insert(AssetIdDto(1), current_rate);
        let dto = portfolio.try_into_dto(rates).expect("overview dto");

        let asset = dto
            .portfolios
            .iter()
            .find_map(|p| match p {
                PortfolioOverviewType::Asset(a) if a.asset_id == 1 => Some(a),
                _ => None,
            })
            .expect("asset overview present");

        assert_eq!(asset.market_value, dec!(260));

        // The naive formula over-counts: gross basis (1000) + unrealized on the
        // 2 remaining units ((130-100)*2 = 60) = 1060, ~4x the true 260.
        let naive_value = asset.total_cost_basis + asset.unrealized_gains;
        assert_eq!(naive_value, dec!(1060));
        assert!(naive_value > asset.market_value * dec!(4));
    }

    #[test]
    fn try_into_dto_omits_held_asset_without_a_current_rate_instead_of_panicking() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(50),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(100),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 2,
                account_id,
                instrument_units: dec!(3),
                instrument_price: dec!(10),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(30),
                date: datetime!(2000-01-01 00:00:00 UTC),
            }),
        ];
        portfolio.process_transactions(input);

        let mut rates = HashMap::new();
        rates.insert(AssetIdDto(1), dec!(60));
        let dto = portfolio.try_into_dto(rates).expect("must not panic");

        let asset_ids: Vec<i32> = dto
            .portfolios
            .iter()
            .filter_map(|p| match p {
                PortfolioOverviewType::Asset(a) => Some(a.asset_id),
                _ => None,
            })
            .collect();
        assert!(asset_ids.contains(&1));
        assert!(!asset_ids.contains(&2));
    }
}
