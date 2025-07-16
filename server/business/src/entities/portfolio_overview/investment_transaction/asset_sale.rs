use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[derive(Clone, Debug)]
pub struct AssetSale {
    pub date: OffsetDateTime,
    pub account_id: Uuid,
    pub instrument_asset_id: i32,
    pub instrument_units: Decimal,
    pub instrument_reference_price: Decimal,
    pub cash_asset_id: i32,
    pub cash_units: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetSale {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        // TODO: add error handling
        portfolio
            .get_asset_portfolio(self.account_id, self.instrument_asset_id)
            .sell_positions(
                self.instrument_units,
                self.instrument_reference_price,
                self.fees,
            );

        portfolio
            .get_cash_portfolio(self.account_id, self.cash_asset_id)
            .add_units(self.cash_units, Decimal::default());
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::entities::portfolio_overview::investment_transaction::{
        asset_purchase::AssetPurchase, asset_transfer_in::AssetTransferIn,
        cash_transfer_in::CashTransferIn,
    };

    use super::*;

    #[test]
    fn portfolio_sale_keeps_positions() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(1),
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: (10),
                cash_units: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1");

        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 1);
        //assert_eq!(asset_portfolio.positions[0].amount_sold, dec!(1));
    }

    #[test]
    fn asset_sale_adds_cash() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(20),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                fees: dec!(0),
                quantity: dec!(20),
                price: dec!(20),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(5),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1");

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(25));
    }
}
