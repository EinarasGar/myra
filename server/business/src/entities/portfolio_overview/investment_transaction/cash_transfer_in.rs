use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct CashTransferIn {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for CashTransferIn {
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
    fn transfer_in_cash_adds_to_account() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashTransferIn {
            asset_id: 1,
            account_id,
            fees: dec!(0),
            units: dec!(1),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1");

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&1)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(1));
    }

    #[test]
    fn transfer_in_with_fee_deducts_fee_from_units() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashTransferIn {
            asset_id: 1,
            account_id,
            fees: dec!(9.18),
            units: dec!(100),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1")
            .cash_portfolios
            .get(&1)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(90.82));
        assert_eq!(cash_portfolio.fees(), dec!(9.18));
    }
}
