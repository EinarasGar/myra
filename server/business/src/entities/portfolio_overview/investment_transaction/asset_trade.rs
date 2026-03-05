use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    dtos::assets::asset_id_dto::AssetIdDto,
    entities::portfolio_overview::portfolio::{
        portfolio_asset_position_dto::PortfolioAssetPosition, Portfolio, PortfolioAction,
        ReferentialPortfolioAction,
    },
};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct AssetTrade {
    pub date: OffsetDateTime,
    pub account_id: Uuid,
    pub outgoing_asset_id: i32,
    pub outgoing_quantity: Decimal,
    pub incoming_asset_id: i32,
    pub incoming_quantity: Decimal,
    pub incoming_price: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetTrade {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        portfolio
            .get_asset_portfolio(self.account_id, self.outgoing_asset_id)
            .remove_positions(self.outgoing_quantity, self.fees);

        let position = PortfolioAssetPosition::new(
            self.incoming_price,
            self.incoming_quantity,
            self.date,
            Decimal::default(),
        );

        portfolio
            .get_asset_portfolio(self.account_id, self.incoming_asset_id)
            .add_positions(vec![position]);
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

impl ReferentialPortfolioAction for AssetTrade {
    fn apply_conversion_rate(&mut self, rate: Decimal) {
        // rate = outgoing asset price in reference currency
        // incoming cost basis = (outgoing_quantity * rate) / incoming_quantity
        self.incoming_price = (self.outgoing_quantity * rate) / self.incoming_quantity;
        self.fees *= rate;
    }

    fn get_conversion_asset_id(&self) -> AssetIdDto {
        AssetIdDto(self.outgoing_asset_id)
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::entities::portfolio_overview::investment_transaction::asset_transfer_in::AssetTransferIn;

    use super::*;

    #[test]
    fn asset_trade_removes_outgoing_positions() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(5),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTrade {
                account_id,
                outgoing_asset_id: 1,
                outgoing_quantity: dec!(5),
                incoming_asset_id: 2,
                incoming_quantity: dec!(10),
                incoming_price: dec!(5),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        // Outgoing asset should be fully removed
        assert!(
            account_portfolio.asset_portfolios.get(&1).is_none(),
            "Outgoing asset portfolio should be removed after full trade"
        );
    }

    #[test]
    fn asset_trade_adds_incoming_positions() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(5),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTrade {
                account_id,
                outgoing_asset_id: 1,
                outgoing_quantity: dec!(5),
                incoming_asset_id: 2,
                incoming_quantity: dec!(10),
                incoming_price: dec!(5),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let incoming_portfolio = account_portfolio
            .asset_portfolios
            .get(&2)
            .expect("Should contain incoming asset");

        assert_eq!(incoming_portfolio.positions.len(), 1);
        assert_eq!(incoming_portfolio.units(), dec!(10));
    }

    #[test]
    fn asset_trade_partial_outgoing_keeps_remaining_positions() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(10),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetTrade {
                account_id,
                outgoing_asset_id: 1,
                outgoing_quantity: dec!(5),
                incoming_asset_id: 2,
                incoming_quantity: dec!(10),
                incoming_price: dec!(5),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let outgoing_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("Should still contain outgoing asset");

        assert_eq!(outgoing_portfolio.units(), dec!(5));
    }
}
