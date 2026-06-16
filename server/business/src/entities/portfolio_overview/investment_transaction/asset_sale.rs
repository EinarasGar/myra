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

impl ReferentialPortfolioAction for AssetSale {
    fn apply_conversion_rate(&mut self, price: Decimal) {
        self.instrument_reference_price *= price;
        self.fees *= price;
    }

    fn get_conversion_asset_id(&self) -> AssetIdDto {
        AssetIdDto(self.cash_asset_id)
    }
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
            .add_units(self.cash_units);
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

    #[test]
    fn partial_sale_grows_fees_and_splits_realized_and_unrealized_gains() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let purchase = AssetPurchase {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(10),
            instrument_price: dec!(100),
            fees: dec!(5),
            cash_asset_id: 10,
            cash_units: dec!(1005),
            date: datetime!(2000-03-22 00:00:00 UTC),
        };
        purchase.update_porfolio(&mut portfolio);

        {
            let asset_portfolio = portfolio.get_asset_portfolio(account_id, 1);
            assert_eq!(asset_portfolio.positions.len(), 1);
            assert_eq!(
                asset_portfolio.positions[0].get_total_cost_basis(),
                dec!(1005)
            );
            assert_eq!(
                asset_portfolio.positions[0].get_unit_cost_basis(),
                dec!(100.50)
            );
        }

        let sale = AssetSale {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(4),
            instrument_reference_price: dec!(120),
            fees: dec!(2),
            cash_asset_id: 10,
            cash_units: dec!(478),
            date: datetime!(2000-04-22 00:00:00 UTC),
        };
        sale.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio.get_asset_portfolio(account_id, 1);
        assert_eq!(asset_portfolio.positions.len(), 1);

        let position = &asset_portfolio.positions[0];
        assert_eq!(position.total_fees(), dec!(7));
        assert_eq!(position.amount_sold(), dec!(4));
        assert_eq!(position.get_amount_left(), dec!(6));
        assert_eq!(position.get_realized_gains(), dec!(77.20));
        assert_eq!(position.get_unrealized_gains(dec!(130)), dec!(175.80));
        assert_eq!(position.get_total_gains(dec!(130)), dec!(253));
    }

    fn portfolio_with_two_lots(account_id: Uuid) -> Portfolio {
        let mut portfolio = Portfolio::new();
        let older = AssetPurchase {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(5),
            instrument_price: dec!(10),
            fees: dec!(1),
            cash_asset_id: 10,
            cash_units: dec!(51),
            date: datetime!(2000-03-22 00:00:00 UTC),
        };
        let newer = AssetPurchase {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(5),
            instrument_price: dec!(20),
            fees: dec!(2),
            cash_asset_id: 10,
            cash_units: dec!(102),
            date: datetime!(2000-04-22 00:00:00 UTC),
        };
        older.update_porfolio(&mut portfolio);
        newer.update_porfolio(&mut portfolio);
        portfolio
    }

    #[test]
    fn sale_consumes_oldest_position_first() {
        let account_id = Uuid::new_v4();
        let mut portfolio = portfolio_with_two_lots(account_id);

        let sale = AssetSale {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(3),
            instrument_reference_price: dec!(30),
            fees: dec!(0),
            cash_asset_id: 10,
            cash_units: dec!(90),
            date: datetime!(2000-05-22 00:00:00 UTC),
        };
        sale.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio.get_asset_portfolio(account_id, 1);
        assert_eq!(asset_portfolio.positions.len(), 2);

        let oldest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-03-22 00:00:00 UTC))
            .expect("oldest lot should still exist");
        let newest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-04-22 00:00:00 UTC))
            .expect("newest lot should still exist");

        assert_eq!(oldest.amount_sold(), dec!(3));
        assert_eq!(oldest.get_amount_left(), dec!(2));
        assert_eq!(newest.amount_sold(), dec!(0));
        assert_eq!(newest.get_amount_left(), dec!(5));
    }

    #[test]
    fn sale_larger_than_oldest_lot_spills_into_next_oldest() {
        let account_id = Uuid::new_v4();
        let mut portfolio = portfolio_with_two_lots(account_id);

        let sale = AssetSale {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(7),
            instrument_reference_price: dec!(30),
            fees: dec!(0),
            cash_asset_id: 10,
            cash_units: dec!(210),
            date: datetime!(2000-05-22 00:00:00 UTC),
        };
        sale.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio.get_asset_portfolio(account_id, 1);

        let oldest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-03-22 00:00:00 UTC))
            .expect("oldest lot should still exist");
        let newest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-04-22 00:00:00 UTC))
            .expect("newest lot should still exist");

        assert_eq!(oldest.amount_sold(), dec!(5));
        assert_eq!(oldest.get_amount_left(), dec!(0));
        assert_eq!(newest.amount_sold(), dec!(2));
        assert_eq!(newest.get_amount_left(), dec!(3));
    }

    #[test]
    fn sale_fees_spread_across_consumed_lots_in_proportion_to_units_sold() {
        let account_id = Uuid::new_v4();
        let mut portfolio = portfolio_with_two_lots(account_id);

        let sale = AssetSale {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(7),
            instrument_reference_price: dec!(30),
            fees: dec!(7),
            cash_asset_id: 10,
            cash_units: dec!(203),
            date: datetime!(2000-05-22 00:00:00 UTC),
        };
        sale.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio.get_asset_portfolio(account_id, 1);

        let oldest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-03-22 00:00:00 UTC))
            .expect("oldest lot should still exist");
        let newest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-04-22 00:00:00 UTC))
            .expect("newest lot should still exist");

        // 5 of 7 sold units come from the oldest lot, 2 of 7 from the newest:
        // the 7 fee splits 5 / 2 on top of each lot's purchase fees (1 and 2).
        // sell_positions computes fees * (amount_selling / quantity) — dividing
        // before multiplying — so 7 * (5/7) comes out as
        // 6.0000000000000000000000000001 instead of exactly 6.
        assert_eq!(oldest.total_fees(), dec!(6));
        assert_eq!(newest.total_fees(), dec!(4));
        assert_eq!(asset_portfolio.total_fees(), dec!(10));
    }

    #[test]
    fn sale_fees_spread_exactly_when_proportions_are_representable() {
        let account_id = Uuid::new_v4();
        let mut portfolio = portfolio_with_two_lots(account_id);

        let sale = AssetSale {
            instrument_asset_id: 1,
            account_id,
            instrument_units: dec!(8),
            instrument_reference_price: dec!(30),
            fees: dec!(8),
            cash_asset_id: 10,
            cash_units: dec!(232),
            date: datetime!(2000-05-22 00:00:00 UTC),
        };
        sale.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio.get_asset_portfolio(account_id, 1);

        let oldest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-03-22 00:00:00 UTC))
            .expect("oldest lot should still exist");
        let newest = asset_portfolio
            .positions
            .iter()
            .find(|p| p.add_date() == datetime!(2000-04-22 00:00:00 UTC))
            .expect("newest lot should still exist");

        assert_eq!(oldest.total_fees(), dec!(6));
        assert_eq!(newest.total_fees(), dec!(5));
        assert_eq!(asset_portfolio.total_fees(), dec!(11));
    }

    #[test]
    fn sale_raises_cash_by_proceeds_net_of_fees() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(1005),
                date: datetime!(2000-03-21 00:00:00 UTC),
            }),
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
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(4),
                instrument_reference_price: dec!(120),
                fees: dec!(2),
                cash_asset_id: 10,
                cash_units: dec!(478),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(478));
    }

    #[test]
    fn oversell_consumes_all_held_units_and_still_adds_full_cash() {
        // Open question 2: oversell surfacing is undecided; today it consumes everything
        // held and cash still rises by the full cash leg; only the consumed share of the
        // sale fee attaches.
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(400),
                date: datetime!(2000-03-21 00:00:00 UTC),
            }),
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(4),
                instrument_price: dec!(100),
                fees: dec!(0),
                cash_asset_id: 10,
                cash_units: dec!(400),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(AssetSale {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(10),
                instrument_reference_price: dec!(120),
                fees: dec!(5),
                cash_asset_id: 10,
                cash_units: dec!(1195),
                date: datetime!(2000-03-23 00:00:00 UTC),
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
        assert_eq!(position.amount_sold(), dec!(4));
        assert_eq!(position.get_amount_left(), dec!(0));
        assert_eq!(position.total_fees(), dec!(2));
        assert_eq!(position.get_realized_gains(), dec!(78));

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");
        assert_eq!(cash_portfolio.units(), dec!(1195));
    }

    #[test]
    fn apply_conversion_rate_multiplies_reference_price_and_fees_only() {
        let mut sale = AssetSale {
            instrument_asset_id: 1,
            account_id: Uuid::new_v4(),
            instrument_units: dec!(4),
            instrument_reference_price: dec!(120),
            fees: dec!(2),
            cash_asset_id: 10,
            cash_units: dec!(478),
            date: datetime!(2000-03-23 00:00:00 UTC),
        };

        sale.apply_conversion_rate(dec!(2));

        assert_eq!(sale.instrument_reference_price, dec!(240));
        assert_eq!(sale.fees, dec!(4));
        assert_eq!(sale.instrument_units, dec!(4));
        assert_eq!(sale.cash_units, dec!(478));
    }

    #[test]
    fn conversion_asset_is_the_cash_asset_and_date_is_exposed() {
        let sale = AssetSale {
            instrument_asset_id: 1,
            account_id: Uuid::new_v4(),
            instrument_units: dec!(4),
            instrument_reference_price: dec!(120),
            fees: dec!(2),
            cash_asset_id: 10,
            cash_units: dec!(478),
            date: datetime!(2000-03-23 00:00:00 UTC),
        };

        assert_eq!(sale.get_conversion_asset_id(), AssetIdDto(10));
        assert_eq!(
            PortfolioAction::date(&sale),
            datetime!(2000-03-23 00:00:00 UTC)
        );
    }
}
