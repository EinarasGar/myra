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
pub struct AssetTransferIn {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub price: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetTransferIn {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let position = PortfolioAssetPosition::new(self.price, self.quantity, self.date, self.fees);

        portfolio
            .get_asset_portfolio(self.account_id, self.asset_id)
            .add_positions(vec![position])
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

impl ReferentialPortfolioAction for AssetTransferIn {
    fn apply_conversion_rate(&mut self, price: Decimal) {
        self.price = price;
    }

    fn get_conversion_asset_id(&self) -> AssetIdDto {
        AssetIdDto(self.asset_id)
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::entities::portfolio_overview::investment_transaction::asset_purchase::AssetPurchase;

    use super::*;

    #[test]
    fn transfer_in_adds_to_account() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(AssetTransferIn {
            asset_id: 1,
            account_id,
            quantity: dec!(1),
            price: dec!(1),
            fees: dec!(1),
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

        assert_eq!(asset_portfolio.positions.len(), 1);
    }

    #[test]
    fn transfer_in_adds_to_same_account_as_purchase() {
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
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(1),
                price: dec!(1),
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

        assert_eq!(asset_portfolio.positions.len(), 2);
    }

    #[test]
    fn transfer_in_merges_purhcase_on_same_date_and_price() {
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
    fn transfer_in_creates_position_at_given_price_units_fees_and_date() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let action = AssetTransferIn {
            asset_id: 7,
            account_id,
            quantity: dec!(10),
            price: dec!(100),
            fees: dec!(5),
            date,
        };

        assert_eq!(action.date(), date);

        portfolio.process_transactions(vec![Box::new(action)]);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .asset_portfolios
            .get(&7)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let position = &asset_portfolio.positions[0];
        assert_eq!(position.add_price(), dec!(100));
        assert_eq!(position.units(), dec!(10));
        assert_eq!(position.total_fees(), dec!(5));
        assert_eq!(position.add_date(), date);
        assert_eq!(position.amount_sold(), dec!(0));
        assert!(!position.is_dividend());
        assert_eq!(position.get_total_cost_basis(), dec!(1005));
    }

    #[test]
    fn transfer_in_merges_with_existing_same_date_same_price_transfer_in() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(2),
                price: dec!(50),
                fees: dec!(1),
                date,
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(3),
                price: dec!(50),
                fees: dec!(2),
                date,
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
        let position = &asset_portfolio.positions[0];
        assert_eq!(position.units(), dec!(5));
        assert_eq!(position.total_fees(), dec!(3));
        assert_eq!(position.add_price(), dec!(50));
        assert_eq!(position.add_date(), date);
        assert_eq!(position.get_total_cost_basis(), dec!(253));
    }

    #[test]
    fn transfer_in_merges_into_existing_purchase_position_with_same_date_and_price() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(4),
                instrument_price: dec!(25),
                fees: dec!(2),
                cash_asset_id: 10,
                cash_units: dec!(100),
                date,
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(6),
                price: dec!(25),
                fees: dec!(3),
                date,
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
        let position = &asset_portfolio.positions[0];
        assert_eq!(position.units(), dec!(10));
        assert_eq!(position.total_fees(), dec!(5));
        assert_eq!(position.add_price(), dec!(25));
        assert_eq!(position.add_date(), date);
    }

    #[test]
    fn transfer_in_same_date_different_price_stays_separate_position() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(2),
                price: dec!(50),
                fees: dec!(1),
                date,
            }),
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id,
                quantity: dec!(3),
                price: dec!(60),
                fees: dec!(1),
                date,
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

        assert_eq!(asset_portfolio.positions.len(), 2);
        let total_units: rust_decimal::Decimal =
            asset_portfolio.positions.iter().map(|p| p.units()).sum();
        assert_eq!(total_units, dec!(5));
    }

    // The rate REPLACES the recorded price rather than multiplying it; fees are left
    // untouched (suspected bug: fees in another currency should also convert).
    #[test]
    fn apply_conversion_rate_replaces_price_with_market_value() {
        let mut action = AssetTransferIn {
            asset_id: 7,
            account_id: Uuid::new_v4(),
            quantity: dec!(10),
            price: dec!(1),
            fees: dec!(5),
            date: datetime!(2000-03-22 00:00:00 UTC),
        };

        action.apply_conversion_rate(dec!(123.45));

        assert_eq!(action.price, dec!(123.45));
        assert_eq!(action.fees, dec!(5));

        let account_id = action.account_id;
        let mut portfolio = Portfolio::new();
        portfolio.process_transactions(vec![Box::new(action)]);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .asset_portfolios
            .get(&7)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 1);
        assert_eq!(asset_portfolio.positions[0].add_price(), dec!(123.45));
        assert_eq!(asset_portfolio.positions[0].total_fees(), dec!(5));
        assert_eq!(
            asset_portfolio.positions[0].get_total_cost_basis(),
            dec!(1239.50)
        );
    }

    #[test]
    fn apply_conversion_rate_replaces_rather_than_scales_a_nonunit_price() {
        let mut action = AssetTransferIn {
            asset_id: 7,
            account_id: Uuid::new_v4(),
            quantity: dec!(1),
            price: dec!(50),
            fees: dec!(0),
            date: datetime!(2000-03-22 00:00:00 UTC),
        };

        action.apply_conversion_rate(dec!(2));

        assert_eq!(action.price, dec!(2));
    }
}
