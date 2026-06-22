use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct AssetBalanceTransfer {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_from: Uuid,
    pub account_to: Uuid,
    pub quantity: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetBalanceTransfer {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        // TODO: Add error handling

        let transfer_positions = portfolio
            .get_asset_portfolio(self.account_from, self.asset_id)
            .remove_positions(self.quantity, self.fees);

        portfolio
            .get_asset_portfolio(self.account_to, self.asset_id)
            .add_positions(transfer_positions);
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
        asset_sale::AssetSale, asset_transfer_in::AssetTransferIn, cash_transfer_in::CashTransferIn,
    };

    use super::*;

    #[test]
    fn balance_transfer_full_moves_position() {
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
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from: account_id,
                account_to: account_id_2,
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
        assert_eq!(
            account_portfolio_2
                .unwrap()
                .asset_portfolios
                .get(&1)
                .unwrap()
                .positions[0]
                .total_fees(),
            dec!(2)
        );
    }

    #[test]
    fn balance_transfer_partial_moves_position_and_keeps_old() {
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
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from: account_id,
                account_to: account_id_2,
                quantity: dec!(1),
                fees: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio.account_portfolios().get(&account_id);
        let account_portfolio_2 = portfolio.account_portfolios().get(&account_id_2);
        assert!(account_portfolio.is_some());
        assert!(account_portfolio_2.is_some());
    }

    #[test]
    fn balance_transfer_spanning_two_lots_moves_oldest_first_preserving_dates_and_prices() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(2),
                price: dec!(10),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(8),
                price: dec!(12),
                fees: dec!(2),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from,
                account_to,
                quantity: dec!(4),
                fees: dec!(2),
                date: datetime!(2000-03-24 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let destination_positions = &portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .asset_portfolios
            .get(&1)
            .expect("destination should hold the asset")
            .positions;

        assert_eq!(destination_positions.len(), 2);

        assert_eq!(
            destination_positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(destination_positions[0].add_price(), dec!(12));
        assert_eq!(destination_positions[0].units(), dec!(2));

        assert_eq!(
            destination_positions[1].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(destination_positions[1].add_price(), dec!(10));
        assert_eq!(destination_positions[1].units(), dec!(2));

        let source_positions = &portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account should still exist")
            .asset_portfolios
            .get(&1)
            .expect("source should still hold the newer lot")
            .positions;

        assert_eq!(source_positions.len(), 1);
        assert_eq!(
            source_positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(source_positions[0].add_price(), dec!(12));
        assert_eq!(source_positions[0].units(), dec!(6));
        assert_eq!(source_positions[0].total_fees(), dec!(1.5));
    }

    #[test]
    fn balance_transfer_partial_lot_splits_fees_proportionally_with_remainder() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(4),
                price: dec!(10),
                fees: dec!(2),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from,
                account_to,
                quantity: dec!(1),
                fees: dec!(0.8),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let source_positions = &portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account should still exist")
            .asset_portfolios
            .get(&1)
            .expect("source should keep the remainder")
            .positions;

        assert_eq!(source_positions.len(), 1);
        assert_eq!(source_positions[0].units(), dec!(3));
        assert_eq!(source_positions[0].total_fees(), dec!(1.5));
        assert_eq!(source_positions[0].add_price(), dec!(10));
        assert_eq!(
            source_positions[0].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(source_positions[0].amount_sold(), dec!(0));

        let destination_positions = &portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .asset_portfolios
            .get(&1)
            .expect("destination should hold the moved part")
            .positions;

        assert_eq!(destination_positions.len(), 1);
        assert_eq!(destination_positions[0].units(), dec!(1));
        assert_eq!(destination_positions[0].total_fees(), dec!(1.3));
        assert_eq!(destination_positions[0].add_price(), dec!(10));
        assert_eq!(
            destination_positions[0].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
    }

    #[test]
    fn balance_transfer_fees_distributed_across_moved_lots_by_units() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(1),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-20 00:00:00 UTC),
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(3),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-21 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from,
                account_to,
                quantity: dec!(4),
                fees: dec!(4),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        assert!(portfolio.account_portfolios().get(&account_from).is_none());

        let destination_positions = &portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .asset_portfolios
            .get(&1)
            .expect("destination should hold the asset")
            .positions;

        assert_eq!(destination_positions.len(), 2);

        assert_eq!(
            destination_positions[0].add_date(),
            datetime!(2000-03-21 00:00:00 UTC)
        );
        assert_eq!(destination_positions[0].units(), dec!(3));
        assert_eq!(destination_positions[0].total_fees(), dec!(3));

        assert_eq!(
            destination_positions[1].add_date(),
            datetime!(2000-03-20 00:00:00 UTC)
        );
        assert_eq!(destination_positions[1].units(), dec!(1));
        assert_eq!(destination_positions[1].total_fees(), dec!(1));
    }

    #[test]
    fn balance_transfer_of_fully_moved_position_carries_realized_gain_history_intact() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(10),
                price: dec!(10),
                fees: dec!(5),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id: account_from,
                instrument_units: dec!(4),
                instrument_reference_price: dec!(12),
                fees: dec!(2),
                cash_asset_id: 10,
                cash_units: dec!(48),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from,
                account_to,
                quantity: dec!(6),
                fees: dec!(1),
                date: datetime!(2000-03-24 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let source_portfolio = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account keeps its sale cash");
        assert!(!source_portfolio.asset_portfolios.contains_key(&1));
        assert_eq!(
            source_portfolio
                .cash_portfolios
                .get(&10)
                .expect("sale proceeds cash stays in the source account")
                .units(),
            dec!(48)
        );

        let destination_positions = &portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .asset_portfolios
            .get(&1)
            .expect("destination should hold the asset")
            .positions;

        assert_eq!(destination_positions.len(), 1);
        let moved = &destination_positions[0];
        assert_eq!(moved.add_price(), dec!(10));
        assert_eq!(moved.add_date(), datetime!(2000-03-22 00:00:00 UTC));
        assert_eq!(moved.units(), dec!(10));
        assert_eq!(moved.amount_sold(), dec!(4));
        assert_eq!(moved.sale_proceeds(), dec!(8));
        assert_eq!(moved.get_amount_left(), dec!(6));
        assert_eq!(moved.total_fees(), dec!(8));
        assert_eq!(moved.get_realized_gains(), dec!(4.8));
    }

    #[test]
    fn balance_transfer_of_asset_without_positions_is_a_silent_no_op() {
        // Cash held as a cash balance has no positions, so an Asset Balance Transfer of
        // the same asset_id is a no-op; cash movements must use Cash Balance Transfer.
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 7,
                account_id: account_from,
                units: dec!(100),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 7,
                account_from,
                account_to,
                quantity: dec!(50),
                fees: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let source_portfolio = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account should still exist");
        assert_eq!(
            source_portfolio
                .cash_portfolios
                .get(&7)
                .expect("source cash balance should be untouched")
                .units(),
            dec!(100)
        );
        assert!(source_portfolio.asset_portfolios.is_empty());

        assert!(portfolio.account_portfolios().get(&account_to).is_none());
    }

    #[test]
    fn balance_transfer_preserves_distinct_prices_of_same_date_lots() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(1),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(1),
                price: dec!(20),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from,
                account_to,
                quantity: dec!(2),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let destination_positions = &portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .asset_portfolios
            .get(&1)
            .expect("destination should hold the asset")
            .positions;

        assert_eq!(destination_positions.len(), 2);

        let cheap_lot = destination_positions
            .iter()
            .find(|p| p.add_price() == dec!(10))
            .expect("the 10-priced lot should arrive with its original price");
        assert_eq!(cheap_lot.units(), dec!(1));
        assert_eq!(cheap_lot.add_date(), datetime!(2000-03-22 00:00:00 UTC));

        let expensive_lot = destination_positions
            .iter()
            .find(|p| p.add_price() == dec!(20))
            .expect("the 20-priced lot should arrive with its original price");
        assert_eq!(expensive_lot.units(), dec!(1));
        assert_eq!(expensive_lot.add_date(), datetime!(2000-03-22 00:00:00 UTC));
    }
}
