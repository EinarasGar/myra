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

#[derive(Clone, Debug)]
pub struct AssetPurchase {
    pub date: OffsetDateTime,
    pub account_id: Uuid,
    pub instrument_asset_id: i32,
    pub instrument_units: Decimal,
    pub instrument_price: Decimal,
    pub cash_asset_id: i32,
    pub cash_units: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetPurchase {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let position = PortfolioAssetPosition::new(
            self.instrument_price,
            self.instrument_units,
            self.date,
            self.fees,
        );

        portfolio
            .get_asset_portfolio(self.account_id, self.instrument_asset_id)
            .add_positions(vec![position]);

        portfolio
            .get_cash_portfolio(self.account_id, self.cash_asset_id)
            .add_units(-self.cash_units);
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

impl ReferentialPortfolioAction for AssetPurchase {
    fn apply_conversion_rate(&mut self, price: Decimal) {
        self.instrument_price *= price;
        self.fees *= price;
    }

    fn get_conversion_asset_id(&self) -> AssetIdDto {
        AssetIdDto(self.cash_asset_id)
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
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-23 00:00:00 UTC),
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
                instrument_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id: account_id_2,
                instrument_units: dec!(1),
                instrument_price: dec!(1),
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
                instrument_price: dec!(1),
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

    #[test]
    fn asset_purchase_creates_position_with_price_units_fees_and_date() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let purchase = AssetPurchase {
            date,
            account_id,
            instrument_asset_id: 1,
            instrument_units: dec!(10),
            instrument_price: dec!(100),
            cash_asset_id: 10,
            cash_units: dec!(1005),
            fees: dec!(5),
        };

        assert_eq!(purchase.date(), date);
        purchase.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
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
        assert_eq!(position.get_unit_cost_basis(), dec!(100.5));
    }

    #[test]
    fn asset_purchase_drops_cash_by_amount_spent_without_double_counting_fees() {
        // Fees attach to the position only — they must not reduce the replay
        // cash a second time. Trading fees do not accumulate on the cash portfolio's fee total.
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let purchase = AssetPurchase {
            date: datetime!(2000-03-22 00:00:00 UTC),
            account_id,
            instrument_asset_id: 1,
            instrument_units: dec!(2),
            instrument_price: dec!(100),
            cash_asset_id: 10,
            cash_units: dec!(201),
            fees: dec!(1),
        };

        purchase.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(-201));
        assert_eq!(cash_portfolio.fees(), dec!(0));
        assert_eq!(cash_portfolio.dividends(), dec!(0));
    }

    #[test]
    fn same_day_same_price_purchases_merge_into_one_position() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                date,
                account_id,
                instrument_asset_id: 1,
                instrument_units: dec!(2),
                instrument_price: dec!(10),
                cash_asset_id: 10,
                cash_units: dec!(21),
                fees: dec!(1),
            }),
            Box::new(AssetPurchase {
                date,
                account_id,
                instrument_asset_id: 1,
                instrument_units: dec!(3),
                instrument_price: dec!(10),
                cash_asset_id: 10,
                cash_units: dec!(32),
                fees: dec!(2),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let position = &asset_portfolio.positions[0];
        assert_eq!(position.add_price(), dec!(10));
        assert_eq!(position.units(), dec!(5));
        assert_eq!(position.total_fees(), dec!(3));
        assert_eq!(position.add_date(), date);

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");
        assert_eq!(cash_portfolio.units(), dec!(-53));
    }

    #[test]
    fn same_day_different_price_purchases_stay_separate_positions() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetPurchase {
                date,
                account_id,
                instrument_asset_id: 1,
                instrument_units: dec!(2),
                instrument_price: dec!(10),
                cash_asset_id: 10,
                cash_units: dec!(21),
                fees: dec!(1),
            }),
            Box::new(AssetPurchase {
                date,
                account_id,
                instrument_asset_id: 1,
                instrument_units: dec!(3),
                instrument_price: dec!(11),
                cash_asset_id: 10,
                cash_units: dec!(35),
                fees: dec!(2),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 2);

        let position_at_10 = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_price() == dec!(10))
            .expect("Should contain position at price 10");
        assert_eq!(position_at_10.units(), dec!(2));
        assert_eq!(position_at_10.total_fees(), dec!(1));
        assert_eq!(position_at_10.add_date(), date);

        let position_at_11 = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_price() == dec!(11))
            .expect("Should contain position at price 11");
        assert_eq!(position_at_11.units(), dec!(3));
        assert_eq!(position_at_11.total_fees(), dec!(2));
        assert_eq!(position_at_11.add_date(), date);
    }

    #[test]
    fn apply_conversion_rate_multiplies_instrument_price_and_fees() {
        // The cash leg stays in its own currency's units; only the instrument price and fees convert.
        let mut purchase = AssetPurchase {
            date: datetime!(2000-03-22 00:00:00 UTC),
            account_id: Uuid::new_v4(),
            instrument_asset_id: 1,
            instrument_units: dec!(2),
            instrument_price: dec!(3),
            cash_asset_id: 10,
            cash_units: dec!(15),
            fees: dec!(5),
        };

        purchase.apply_conversion_rate(dec!(2));

        let mut portfolio = Portfolio::new();
        purchase.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&purchase.account_id)
            .expect("Should contain account");

        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("Should contain asset");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let position = &asset_portfolio.positions[0];
        assert_eq!(position.add_price(), dec!(6));
        assert_eq!(position.total_fees(), dec!(10));
        assert_eq!(position.units(), dec!(2));

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");
        assert_eq!(cash_portfolio.units(), dec!(-15));
    }
}
