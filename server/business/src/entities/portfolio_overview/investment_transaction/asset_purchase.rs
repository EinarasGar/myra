use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{
    portfolio_asset_position_dto::PortfolioAssetPosition, Portfolio, PortfolioAction,
};

#[derive(Clone)]
pub struct AssetPurchase {
    pub date: OffsetDateTime,
    pub account_id: Uuid,
    pub instrument_asset_id: i32,
    pub instrument_units: Decimal,
    pub instrument_reference_price: Decimal,
    pub cash_asset_id: i32,
    pub cash_units: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetPurchase {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let position = PortfolioAssetPosition::new(
            self.instrument_reference_price,
            self.instrument_units,
            self.date,
            self.fees,
        );

        portfolio
            .get_asset_portfolio(self.account_id, self.instrument_asset_id)
            .add_positions(vec![position]);

        portfolio
            .get_cash_portfolio(self.account_id, self.cash_asset_id)
            .add_units(-self.cash_units, Decimal::default());
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
    fn portfolio_purhcase_adds_to_same_account() {
        let mut portfolio = Portfolio::new();

        let account_id = Uuid::new_v4();
        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);
        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        assert_eq!(account_portfolio.asset_portfolios.len(), 1);

        let asset_portfolio_1 = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio_1.positions.len(), 2);
    }

    #[test]
    fn portfolio_purhcase_adds_to_different_accounts() {
        let mut portfolio = Portfolio::new();

        let account_id_1 = Uuid::new_v4();
        let account_id_2 = Uuid::new_v4();
        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_id_1,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_id_2,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);
        let account_portfolio_1 = portfolio
            .account_portfolios()
            .get(&account_id_1)
            .expect("Should contain account 1");

        let account_portfolio_2 = portfolio
            .account_portfolios()
            .get(&account_id_2)
            .expect("Should contain account 1");

        assert_eq!(account_portfolio_1.asset_portfolios.len(), 1);
        assert_eq!(account_portfolio_2.asset_portfolios.len(), 1);
    }

    #[test]
    fn asset_purchase_deducts_cash() {
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
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(15),
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

        assert_eq!(cash_portfolio.units(), dec!(5));
    }
}
