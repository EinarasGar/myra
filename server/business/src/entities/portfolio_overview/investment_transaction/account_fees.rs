use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct AccountFees {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
}

impl PortfolioAction for AccountFees {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let cash = portfolio.get_cash_portfolio(self.account_id, self.asset_id);
        cash.add_fees(self.quantity);
        cash.add_units(-self.quantity);
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::entities::portfolio_overview::investment_transaction::cash_transfer_in::CashTransferIn;

    use super::*;

    #[test]
    fn account_fees_adds_fees() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(AccountFees {
            asset_id: 10,
            account_id,
            quantity: dec!(5),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1");

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.fees(), dec!(5));
        assert_eq!(cash_portfolio.units(), dec!(-5));
    }

    #[test]
    fn account_fees_reduce_existing_cash_balance() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AccountFees {
                asset_id: 10,
                account_id,
                quantity: dec!(7.25),
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

        assert_eq!(cash_portfolio.units(), dec!(92.75));
        assert_eq!(cash_portfolio.fees(), dec!(7.25));
    }

    #[test]
    fn account_fees_accumulate_across_multiple_charges() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AccountFees {
                asset_id: 10,
                account_id,
                quantity: dec!(5),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AccountFees {
                asset_id: 10,
                account_id,
                quantity: dec!(2.5),
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

        assert_eq!(cash_portfolio.units(), dec!(-7.5));
        assert_eq!(cash_portfolio.fees(), dec!(7.5));
    }
}
