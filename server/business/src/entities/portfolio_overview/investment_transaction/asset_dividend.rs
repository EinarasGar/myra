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

/// A cash fee entry riding on the dividend (e.g. withholding tax), with its own
/// currency and account so it lands on the right cash portfolio during replay.
///
/// Asset Dividend is currently the only type that routes fee entries this way;
/// the other typed transactions still collapse fees into a single scalar and
/// assume the transaction's own currency. Routing per-entry cash fees uniformly
/// across every type is a deliberate follow-up, not done here.
#[derive(Clone, Debug)]
pub struct CashFeeEntry {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct AssetDividend {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub price: Decimal,
    pub fees: Decimal,
    pub cash_fees: Vec<CashFeeEntry>,
}

impl PortfolioAction for AssetDividend {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let position =
            PortfolioAssetPosition::new_dividend(self.price, self.quantity, self.date, self.fees);

        portfolio
            .get_asset_portfolio(self.account_id, self.asset_id)
            .add_positions(vec![position]);

        for fee in &self.cash_fees {
            let cash = portfolio.get_cash_portfolio(fee.account_id, fee.asset_id);
            cash.add_units(fee.quantity);
            cash.add_fees(-fee.quantity);
        }
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

impl ReferentialPortfolioAction for AssetDividend {
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

    use crate::entities::portfolio_overview::investment_transaction::{
        asset_purchase::AssetPurchase, asset_sale::AssetSale,
    };

    use super::*;

    #[test]
    fn add_asset_dividend_adds_position_and_dividends() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(AssetDividend {
            asset_id: 1,
            account_id,
            quantity: dec!(5),
            price: dec!(10),
            fees: dec!(0),
            cash_fees: vec![],
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
        assert_eq!(asset_portfolio.asset_dividends(), dec!(5));
    }

    #[test]
    fn asset_dividend_opens_dividend_flagged_position_with_price_date_and_fees() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2024-05-01 00:00:00 UTC);

        let action = AssetDividend {
            date,
            asset_id: 1,
            account_id,
            quantity: dec!(5),
            price: dec!(10),
            fees: dec!(2),
            cash_fees: vec![],
        };

        assert_eq!(action.date(), date);

        action.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio should exist")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio should exist");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let position = &asset_portfolio.positions[0];
        assert!(position.is_dividend());
        assert_eq!(position.add_price(), dec!(10));
        assert_eq!(position.add_date(), date);
        assert_eq!(position.units(), dec!(5));
        assert_eq!(position.total_fees(), dec!(2));
        assert_eq!(position.amount_sold(), dec!(0));
        assert_eq!(position.get_total_cost_basis(), dec!(52));
    }

    #[test]
    fn dividend_lot_appreciation_shows_in_unrealized_gains() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let action = AssetDividend {
            date: datetime!(2024-05-01 00:00:00 UTC),
            asset_id: 1,
            account_id,
            quantity: dec!(5),
            price: dec!(10),
            fees: dec!(2),
            cash_fees: vec![],
        };

        action.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio should exist")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio should exist");

        // (13 - 10) * 5 - 2 * (5/5) = 13
        assert_eq!(
            asset_portfolio.positions[0].get_unrealized_gains(dec!(13)),
            dec!(13)
        );
        assert_eq!(asset_portfolio.unrealized_gains(dec!(13)), dec!(13));
    }

    #[test]
    fn later_sale_consumes_dividend_lot_fifo_oldest_first() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetDividend {
                asset_id: 1,
                account_id,
                quantity: dec!(5),
                price: dec!(10),
                fees: dec!(0),
                cash_fees: vec![],
                date: datetime!(2024-01-01 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(5),
                instrument_price: dec!(20),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(100),
                date: datetime!(2024-02-01 00:00:00 UTC),
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(8),
                instrument_reference_price: dec!(25),
                fees: dec!(8),
                cash_asset_id: 10,
                cash_units: dec!(192),
                date: datetime!(2024-03-01 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio should exist")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio should exist");

        assert_eq!(asset_portfolio.positions.len(), 2);

        let purchase_lot = &asset_portfolio.positions[0];
        assert!(!purchase_lot.is_dividend());
        assert_eq!(purchase_lot.add_date(), datetime!(2024-02-01 00:00:00 UTC));
        assert_eq!(purchase_lot.amount_sold(), dec!(3));
        assert_eq!(purchase_lot.get_amount_left(), dec!(2));
        assert_eq!(purchase_lot.total_fees(), dec!(3));

        let dividend_lot = &asset_portfolio.positions[1];
        assert!(dividend_lot.is_dividend());
        assert_eq!(dividend_lot.add_date(), datetime!(2024-01-01 00:00:00 UTC));
        assert_eq!(dividend_lot.amount_sold(), dec!(5));
        assert_eq!(dividend_lot.get_amount_left(), dec!(0));
        assert_eq!(dividend_lot.total_fees(), dec!(5));
        assert_eq!(dividend_lot.get_realized_gains(), dec!(70));
    }

    #[test]
    fn asset_dividends_aggregate_counts_only_dividend_lot_units() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetDividend {
                asset_id: 1,
                account_id,
                quantity: dec!(3),
                price: dec!(10),
                fees: dec!(0),
                cash_fees: vec![],
                date: datetime!(2024-01-01 00:00:00 UTC),
            }),
            Box::new(AssetDividend {
                asset_id: 1,
                account_id,
                quantity: dec!(4),
                price: dec!(12),
                fees: dec!(0),
                cash_fees: vec![],
                date: datetime!(2024-02-01 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(7),
                instrument_price: dec!(10),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(70),
                date: datetime!(2024-03-01 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio should exist")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio should exist");

        assert_eq!(asset_portfolio.positions.len(), 3);
        assert_eq!(asset_portfolio.asset_dividends(), dec!(7));
    }

    #[test]
    fn withholding_fee_lowers_cash_and_builds_fee_total() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let action = AssetDividend {
            date: datetime!(2024-05-01 00:00:00 UTC),
            asset_id: 1,
            account_id,
            quantity: dec!(5),
            price: dec!(10),
            fees: dec!(0),
            cash_fees: vec![CashFeeEntry {
                asset_id: 20,
                account_id,
                quantity: dec!(-2),
            }],
        };

        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio should exist");
        assert_eq!(
            account_portfolio
                .asset_portfolios
                .get(&1)
                .unwrap()
                .positions[0]
                .total_fees(),
            dec!(0)
        );
        let cash = account_portfolio
            .cash_portfolios
            .get(&20)
            .expect("withholding accumulates on the cash portfolio");
        assert_eq!(cash.units(), dec!(-2));
        assert_eq!(cash.fees(), dec!(2));
    }

    #[test]
    fn conversion_rate_replaces_price_with_market_value_on_dividend_date() {
        // The supplied rate becomes the lot price outright — it replaces any prior price
        // rather than scaling it (unlike Asset Purchase where the rate is a multiplier).
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();
        let date = datetime!(2024-05-01 00:00:00 UTC);

        let mut action = AssetDividend {
            date,
            asset_id: 7,
            account_id,
            quantity: dec!(2),
            price: dec!(3),
            fees: dec!(0),
            cash_fees: vec![],
        };

        assert_eq!(action.get_conversion_asset_id(), AssetIdDto(7));

        action.apply_conversion_rate(dec!(42));
        action.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio should exist")
            .asset_portfolios
            .get(&7)
            .expect("asset portfolio should exist");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let position = &asset_portfolio.positions[0];
        assert_eq!(position.add_price(), dec!(42));
        assert_eq!(position.add_date(), date);
        assert!(position.is_dividend());
        assert_eq!(position.get_total_cost_basis(), dec!(84));
    }
}
