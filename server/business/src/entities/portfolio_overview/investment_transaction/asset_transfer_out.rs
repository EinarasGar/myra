use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    dtos::assets::asset_id_dto::AssetIdDto,
    entities::portfolio_overview::portfolio::{
        Portfolio, PortfolioAction, ReferentialPortfolioAction,
    },
};

#[allow(dead_code)]
#[derive(Clone, Debug)]
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

impl ReferentialPortfolioAction for AssetTransferOut {
    fn apply_conversion_rate(&mut self, price: Decimal) {
        self.fees *= price;
    }

    fn get_conversion_asset_id(&self) -> AssetIdDto {
        AssetIdDto(self.asset_id)
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
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
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
                account_id: account_id_2,
                quantity: dec!(2),
                price: dec!(1),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
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
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 2,
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
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
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
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

    #[test]
    fn transfer_out_removes_units_from_oldest_lot_first() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(10),
                fees: dec!(2),
                cash_asset_id: 10,
                cash_units: dec!(22),
                date: datetime!(2000-01-10 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(4),
                instrument_price: dec!(20),
                fees: dec!(8),
                cash_asset_id: 10,
                cash_units: dec!(88),
                date: datetime!(2000-02-10 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
                quantity: dec!(3),
                fees: dec!(0),
                date: datetime!(2000-03-01 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 1);
        assert_eq!(
            asset_portfolio.positions[0].add_date(),
            datetime!(2000-02-10 00:00:00 UTC)
        );
        assert_eq!(asset_portfolio.positions[0].add_price(), dec!(20));
        assert_eq!(asset_portfolio.positions[0].units(), dec!(3));
        assert_eq!(asset_portfolio.positions[0].total_fees(), dec!(6));
    }

    #[test]
    fn transfer_out_quarter_of_lot_takes_quarter_of_its_fees() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(8),
                instrument_price: dec!(10),
                fees: dec!(8),
                cash_asset_id: 10,
                cash_units: dec!(88),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
                quantity: dec!(2),
                fees: dec!(5),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 1);
        assert_eq!(asset_portfolio.positions[0].units(), dec!(6));
        assert_eq!(asset_portfolio.positions[0].total_fees(), dec!(6));
        assert_eq!(asset_portfolio.total_fees(), dec!(6));
    }

    #[test]
    fn transfer_out_removes_cost_and_fees_from_portfolio_totals() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(10),
                instrument_price: dec!(100),
                fees: dec!(5),
                cash_asset_id: 10,
                cash_units: dec!(1005),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
                quantity: dec!(4),
                fees: dec!(2),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.units(), dec!(6));
        assert_eq!(asset_portfolio.total_fees(), dec!(3));
        assert_eq!(asset_portfolio.total_cost_basis(), dec!(603));
    }

    // Open question 2: whether a transfer-out exceeding recorded holdings should warn or be
    // blocked is undecided; today the excess is consumed silently and the position empties.
    #[test]
    fn transfer_out_exceeding_holdings_consumes_all_units_silently() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(2),
                instrument_price: dec!(10),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(21),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 2,
                account_id,
                instrument_units: dec!(1),
                instrument_price: dec!(10),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(10),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferOut {
                asset_id: 1,
                account_id,
                quantity: dec!(5),
                fees: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        assert!(account_portfolio.asset_portfolios.get(&1).is_none());
        assert!(account_portfolio.asset_portfolios.get(&2).is_some());
    }

    #[test]
    fn conversion_rate_multiplies_fees_only() {
        let mut action = AssetTransferOut {
            asset_id: 7,
            account_id: Uuid::new_v4(),
            quantity: dec!(3),
            fees: dec!(5),
            date: datetime!(2000-03-22 00:00:00 UTC),
        };

        action.apply_conversion_rate(dec!(2));

        assert_eq!(action.fees, dec!(10));
        assert_eq!(action.quantity, dec!(3));
        assert_eq!(action.get_conversion_asset_id(), AssetIdDto(7));
        assert_eq!(action.date(), datetime!(2000-03-22 00:00:00 UTC));
    }
}
