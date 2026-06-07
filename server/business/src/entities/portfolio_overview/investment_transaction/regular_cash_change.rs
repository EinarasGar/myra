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
}
