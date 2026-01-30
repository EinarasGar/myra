use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct CashDividend {
    pub date: OffsetDateTime,
    #[allow(dead_code)]
    pub origin_asset_id: i32,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub price: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for CashDividend {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        portfolio
            .get_asset_portfolio(self.account_id, self.asset_id)
            .add_cash_dividends(self.quantity * self.price);

        portfolio
            .get_cash_portfolio(self.account_id, self.asset_id)
            .add_units(self.quantity, self.fees);
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
    fn add_cash_dividends_adds_cash_to_asset_and_cash_portfolios() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashDividend {
            asset_id: 10,
            account_id,
            quantity: dec!(5),
            origin_asset_id: 1,
            price: dec!(1.2),
            fees: dec!(0),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1");
        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");
        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(asset_portfolio.positions.len(), 0);
        assert_eq!(cash_portfolio.units(), dec!(5));
        assert_eq!(cash_portfolio.dividends(), dec!(0));
        assert_eq!(asset_portfolio.cash_dividends(), dec!(6))
    }
}
