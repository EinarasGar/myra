use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[derive(Clone)]
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

    use crate::entities::portfolio_overview::investment_transaction::asset_transfer_in::AssetTransferIn;

    use super::*;

    #[test]
    fn balance_transfer_full_moves_position() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let account_id_2 = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_id.clone(),
                quantity: dec!(2),
                price: dec!(1),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from: account_id.clone(),
                account_to: account_id_2.clone(),
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
                account_id: account_id.clone(),
                quantity: dec!(2),
                price: dec!(1),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetBalanceTransfer {
                asset_id: 1,
                account_from: account_id.clone(),
                account_to: account_id_2.clone(),
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
}
