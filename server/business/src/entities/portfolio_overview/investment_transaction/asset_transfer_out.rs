use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[derive(Clone)]
pub struct AssetTransferOut {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetTransferOut {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        // TODO: Add error handling
        portfolio
            .get_asset_portfolio(self.account_id, self.asset_id)
            .remove_positions(self.quantity, self.fees);
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
    };

    use super::*;

    #[test]
    fn transfer_out_partial_doesnt_remove_position() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_id.clone(),
                instrument_units: dec!(2),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id: account_id.clone(),
                quantity: dec!(1),
                fees: dec!(1),
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
        assert_eq!(asset_portfolio.positions[0].units(), dec!(1));
    }

    #[test]
    fn transfer_out_full_removes_position_and_asset_portfolio_and_account() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let account_id_2 = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(2),
                price: dec!(1),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_id_2.clone(),
                quantity: dec!(2),
                price: dec!(1),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id: account_id.clone(),
                quantity: dec!(2),
                fees: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio.account_portfolios().get(&account_id);
        let account_portfolio_2 = portfolio.account_portfolios().get(&account_id_2);
        assert!(account_portfolio.is_none());
        assert!(account_portfolio_2.is_some());
    }

    #[test]
    fn transfer_out_full_removes_position_and_asset_portfolio() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_id.clone(),
                instrument_units: dec!(2),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 2,
                account_id: account_id.clone(),
                instrument_units: dec!(2),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id: account_id.clone(),
                quantity: dec!(2),
                fees: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1");

        let asset_portfolio_1 = account_portfolio.asset_portfolios.get(&1);

        let asset_portfolio_2 = account_portfolio.asset_portfolios.get(&2);

        assert!(asset_portfolio_2.is_some());
        assert!(asset_portfolio_1.is_none());
    }

    #[test]
    fn transfer_out_full_removes_position() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_id.clone(),
                instrument_units: dec!(2),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_id.clone(),
                instrument_units: dec!(2),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id: account_id.clone(),
                quantity: dec!(2),
                fees: dec!(1),
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
    }
}
