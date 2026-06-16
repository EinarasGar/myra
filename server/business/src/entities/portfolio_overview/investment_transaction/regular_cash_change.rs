use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct RegularCashChange {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for RegularCashChange {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let cash = portfolio.get_cash_portfolio(self.account_id, self.asset_id);
        cash.add_units(self.units - self.fees);
        cash.add_fees(self.fees);
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use super::*;

    #[test]
    fn regular_spending_reduces_cash() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(RegularCashChange {
            asset_id: 10,
            account_id,
            units: dec!(-100),
            fees: dec!(0),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(-100));
    }

    #[test]
    fn regular_income_increases_cash() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(RegularCashChange {
            asset_id: 10,
            account_id,
            units: dec!(50),
            fees: dec!(0),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(50));
    }

    #[test]
    fn regular_income_with_fee_nets_to_holdings() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(RegularCashChange {
            asset_id: 10,
            account_id,
            units: dec!(50),
            fees: dec!(2),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(48));
        assert_eq!(cash_portfolio.fees(), dec!(2));
    }

    #[test]
    fn regular_spending_with_fee_deducts_fee_from_units() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(RegularCashChange {
            asset_id: 10,
            account_id,
            units: dec!(-100),
            fees: dec!(5),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(-105));
        assert_eq!(cash_portfolio.fees(), dec!(5));
    }

    #[test]
    fn regular_changes_accumulate_units_and_fees_across_actions() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(1000),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(-200),
                fees: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(50),
                fees: dec!(2),
                date: datetime!(2000-03-24 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(847));
        assert_eq!(cash_portfolio.fees(), dec!(3));
        assert_eq!(cash_portfolio.dividends(), dec!(0));
    }

    #[test]
    fn regular_changes_keep_multiple_accounts_separate() {
        let mut portfolio = Portfolio::new();
        let account_a = Uuid::new_v4();
        let account_b = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id: account_a,
                units: dec!(100),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id: account_b,
                units: dec!(-40),
                fees: dec!(2),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_a = portfolio
            .account_portfolios()
            .get(&account_a)
            .expect("Should contain account a")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash a");
        assert_eq!(cash_a.units(), dec!(99));
        assert_eq!(cash_a.fees(), dec!(1));

        let cash_b = portfolio
            .account_portfolios()
            .get(&account_b)
            .expect("Should contain account b")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash b");
        assert_eq!(cash_b.units(), dec!(-42));
        assert_eq!(cash_b.fees(), dec!(2));
    }

    #[test]
    fn regular_changes_keep_multiple_currencies_separate() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(RegularCashChange {
                asset_id: 1,
                account_id,
                units: dec!(100),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(RegularCashChange {
                asset_id: 2,
                account_id,
                units: dec!(-30),
                fees: dec!(0.5),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let eur = account_portfolio
            .cash_portfolios
            .get(&1)
            .expect("Should contain currency 1");
        assert_eq!(eur.units(), dec!(99));
        assert_eq!(eur.fees(), dec!(1));

        let usd = account_portfolio
            .cash_portfolios
            .get(&2)
            .expect("Should contain currency 2");
        assert_eq!(usd.units(), dec!(-30.5));
        assert_eq!(usd.fees(), dec!(0.5));
    }

    #[test]
    fn regular_changes_netting_to_exactly_zero_are_pruned() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(100),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(-100),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        assert!(portfolio.account_portfolios().get(&account_id).is_none());
    }

    #[test]
    fn zero_balance_with_nonzero_fees_survives_pruning() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(100),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(-98),
                fees: dec!(2),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Account with fees paid must survive pruning")
            .cash_portfolios
            .get(&10)
            .expect("Cash portfolio with fees paid must survive pruning");

        assert_eq!(cash_portfolio.units(), dec!(0));
        assert_eq!(cash_portfolio.fees(), dec!(2));
    }

    // The entity layer (RegularTransaction::get_portfolio_action) negates the negative
    // ledger fee entries, so this action always receives a positive fee scalar; the fee
    // total accumulates positively while cash is always lowered by the fee.
    #[test]
    fn fees_are_positive_scalars_that_always_lower_cash() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(10),
                fees: dec!(3),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(RegularCashChange {
                asset_id: 10,
                account_id,
                units: dec!(-10),
                fees: dec!(3),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(-6));
        assert_eq!(cash_portfolio.fees(), dec!(6));
    }
}
