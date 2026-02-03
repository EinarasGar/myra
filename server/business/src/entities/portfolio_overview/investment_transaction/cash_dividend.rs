use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    dtos::assets::asset_id_dto::AssetIdDto,
    entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction, ReferentialPortfolioAction},
};

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
            .get_asset_portfolio(self.account_id, self.origin_asset_id)
            .add_cash_dividends(self.quantity * self.price);

        let cash = portfolio.get_cash_portfolio(self.account_id, self.asset_id);
        cash.add_units(self.quantity, self.fees);
        cash.add_fees(self.fees);
        cash.add_dividends(self.quantity * self.price);
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

impl ReferentialPortfolioAction for CashDividend {
    fn apply_conversion_rate(&mut self, price: Decimal) {
        self.price *= price;
    }

    fn get_conversion_asset_id(&self) -> AssetIdDto {
        AssetIdDto(self.asset_id)
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
        assert_eq!(cash_portfolio.dividends(), dec!(6));
        assert_eq!(asset_portfolio.cash_dividends(), dec!(6))
    }

    #[test]
    fn add_cash_dividends_with_fees_tracks_fees_on_cash_portfolio() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashDividend {
            asset_id: 10,
            account_id,
            quantity: dec!(0.41),
            origin_asset_id: 1,
            price: dec!(1),
            fees: dec!(0.07),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");
        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(0.41));
        assert_eq!(cash_portfolio.fees(), dec!(0.07));
        assert_eq!(cash_portfolio.dividends(), dec!(0.41));
    }
}
