use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use tracing::warn;

use super::portfolio_asset_position_dto::PortfolioAssetPosition;

#[derive(Clone, Debug)]
pub struct AccountAssetPortfolio {
    pub positions: Vec<PortfolioAssetPosition>,
    pub cash_dividends: Decimal,
}

impl Default for AccountAssetPortfolio {
    fn default() -> Self {
        Self {
            positions: vec![],
            cash_dividends: dec!(0),
        }
    }
}

impl AccountAssetPortfolio {
    fn sort(&mut self) {
        self.positions.sort_by(|a, b| b.compare_by_date(a));
    }

    pub fn add_positions(&mut self, mut positions: Vec<PortfolioAssetPosition>) {
        if positions.len() > 1 {
            // Merge only when both date AND price match (is_same_position).
            // Collapsing by date alone would re-price same-date different-price lots
            // and corrupt their cost basis.
            let mut merged: Vec<PortfolioAssetPosition> = Vec::with_capacity(positions.len());
            for position in positions {
                if let Some(existing) = merged.iter_mut().find(|p| p.is_same_position(&position)) {
                    existing.merge(&position);
                } else {
                    merged.push(position);
                }
            }
            positions = merged;
        }

        //Merge any transactions any positions that are in the 'to' portfolio
        //if the date and the price matches
        positions.retain(|new_position| {
            let mut to_remove = false;
            self.positions.iter_mut().for_each(|existing_position| {
                if existing_position.is_same_position(new_position) {
                    existing_position.merge(new_position);
                    to_remove = true;
                }
            });
            !to_remove
        });

        //For the rest of the positions just add them to the 'to' portfolio
        self.positions.append(&mut positions);
        self.sort();
    }

    pub fn sell_positions(&mut self, quantity: Decimal, price: Decimal, fees: Decimal) {
        let mut left_to_sell = quantity;
        while left_to_sell > dec!(0) {
            if let Some(position) = self
                .positions
                .iter_mut()
                .rev()
                .find(|x| x.get_amount_left() > dec!(0))
            {
                let amount_left_in_position = position.get_amount_left();
                let amount_selling = if amount_left_in_position < left_to_sell {
                    amount_left_in_position
                } else {
                    left_to_sell
                };

                // Multiply before dividing to avoid Decimal rounding from the intermediate quotient.
                let sale_fees = fees * amount_selling / quantity;
                position.sell(amount_selling, price, sale_fees);
                left_to_sell -= amount_selling;
            } else {
                warn!(remaining = %left_to_sell, "oversell: not enough units held, selling all available");
                break;
            }
        }
        self.sort();
    }

    pub fn remove_positions(
        &mut self,
        quantity: Decimal,
        fees: Decimal,
    ) -> Vec<PortfolioAssetPosition> {
        let mut removed_positions: Vec<PortfolioAssetPosition> = vec![];
        let mut left_to_remove = quantity;
        while left_to_remove > dec!(0) {
            if let Some(position_index) = self
                .positions
                .iter()
                .rposition(|x| x.get_amount_left() > dec!(0))
            {
                let position = self.positions.get_mut(position_index).unwrap();
                let amount_left_in_position = position.get_amount_left();
                let amount_transfering = if amount_left_in_position < left_to_remove {
                    amount_left_in_position
                } else {
                    left_to_remove
                };

                left_to_remove -= amount_transfering;

                // A case where position does not have sold assets - we are transfeing full position
                if amount_left_in_position == amount_transfering {
                    let mut transfered_position = position.clone();
                    transfered_position.add_fees(fees * amount_transfering / quantity);
                    removed_positions.push(transfered_position);
                    self.positions.remove(position_index);
                    continue;
                }

                // Fee share uses units ADDED, not units left: the already-sold
                // units' share stays with the source where realized gains already
                // deducted it — every fee is counted exactly once.
                // Multiply before dividing to stay exact.
                let units_added = position.units();
                let own_fees_moved = position.total_fees() * amount_transfering / units_added;
                let new_fees_moved = fees * amount_transfering / quantity;

                let transfered_postion = PortfolioAssetPosition::new(
                    position.add_price(),
                    amount_transfering,
                    position.add_date(),
                    own_fees_moved + new_fees_moved,
                );
                position.add_quantity(-amount_transfering, -own_fees_moved);
                removed_positions.push(transfered_postion);
            } else {
                warn!(remaining = %left_to_remove, "over-transfer: not enough units held, transferring all available");
                break;
            }
        }
        self.sort();
        removed_positions.sort_by(|a, b| b.compare_by_date(a));
        removed_positions
    }

    #[allow(dead_code)]
    pub fn units(&self) -> Decimal {
        self.positions.iter().map(|x| x.units()).sum()
    }

    #[allow(dead_code)]
    pub fn total_fees(&self) -> Decimal {
        self.positions.iter().map(|x| x.total_fees()).sum()
    }

    #[allow(dead_code)]
    pub fn realized_gains(&self) -> Decimal {
        self.positions.iter().map(|x| x.get_realized_gains()).sum()
    }

    #[allow(dead_code)]
    pub fn unrealized_gains(&self, current_rate: Decimal) -> Decimal {
        self.positions
            .iter()
            .map(|x| x.get_unrealized_gains(current_rate))
            .sum()
    }

    #[allow(dead_code)]
    pub fn total_gains(&self, current_rate: Decimal) -> Decimal {
        self.positions
            .iter()
            .map(|x| x.get_total_gains(current_rate))
            .sum()
    }

    #[allow(dead_code)]
    pub fn total_cost_basis(&self) -> Decimal {
        self.positions
            .iter()
            .map(|x| x.get_total_cost_basis())
            .sum()
    }

    #[allow(dead_code)]
    pub fn get_unit_cost_basis(&self) -> Decimal {
        self.positions.iter().map(|x| x.get_unit_cost_basis()).sum()
    }

    #[allow(dead_code)]
    pub fn remaining_units(&self) -> Decimal {
        self.positions.iter().map(|x| x.get_amount_left()).sum()
    }

    // `total_cost_basis + unrealized_gains` over-counts: cost basis is gross across
    // all lots ever acquired, including sold units. This gives the true current value.
    #[allow(dead_code)]
    pub fn market_value(&self, current_rate: Decimal) -> Decimal {
        self.remaining_units() * current_rate
    }

    #[allow(dead_code)]
    pub fn asset_dividends(&self) -> Decimal {
        self.positions
            .iter()
            .filter(|x| x.is_dividend())
            .map(|x| x.units())
            .sum()
    }

    #[allow(dead_code)]
    pub fn asset_dividends_gains(&self, current_rate: Decimal) -> Decimal {
        self.positions
            .iter()
            .filter(|x| x.is_dividend())
            .map(|x| x.get_total_gains(current_rate))
            .sum()
    }

    pub fn add_cash_dividends(&mut self, cash_dividends: Decimal) {
        self.cash_dividends += cash_dividends;
    }

    #[allow(dead_code)]
    pub fn cash_dividends(&self) -> Decimal {
        self.cash_dividends
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::{macros::datetime, OffsetDateTime};

    use crate::entities::portfolio_overview::portfolio::{
        account_asset_portfolio::AccountAssetPortfolio,
        portfolio_asset_position_dto::PortfolioAssetPosition,
    };

    #[tokio::test]
    async fn test_add_single_position() {
        let mut portfolio = AccountAssetPortfolio::default();

        let position =
            PortfolioAssetPosition::new(dec!(10), dec!(2), OffsetDateTime::now_utc(), dec!(1));

        portfolio.add_positions(vec![position]);

        assert_eq!(portfolio.positions.len(), 1);
        assert_eq!(portfolio.positions[0].units(), dec!(2));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(1));
        assert_eq!(portfolio.positions[0].add_price(), dec!(10));
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(0));
    }

    #[tokio::test]
    async fn test_add_multiple_position() {
        let mut portfolio = AccountAssetPortfolio::default();

        let position1 = PortfolioAssetPosition::new(
            dec!(10),
            dec!(2),
            datetime!(2000-03-22 00:00:00 UTC),
            dec!(1),
        );

        let position2 = PortfolioAssetPosition::new(
            dec!(11),
            dec!(3),
            datetime!(2000-03-23 00:00:00 UTC),
            dec!(1),
        );

        portfolio.add_positions(vec![position1, position2]);

        assert_eq!(portfolio.positions.len(), 2);
        assert_eq!(portfolio.positions[0].units(), dec!(3));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(1));
        assert_eq!(portfolio.positions[0].add_price(), dec!(11));
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(0));

        assert_eq!(portfolio.positions[1].units(), dec!(2));
        assert_eq!(portfolio.positions[1].total_fees(), dec!(1));
        assert_eq!(portfolio.positions[1].add_price(), dec!(10));
        assert_eq!(portfolio.positions[1].amount_sold(), dec!(0));
    }

    #[tokio::test]
    async fn test_add_empty() {
        let mut portfolio = AccountAssetPortfolio::default();
        portfolio.add_positions(vec![]);
        assert_eq!(portfolio.positions.len(), 0);
    }

    #[tokio::test]
    async fn test_add_multiple_position_same_date() {
        let mut portfolio = AccountAssetPortfolio::default();

        let position1 = PortfolioAssetPosition::new(
            dec!(10),
            dec!(2),
            datetime!(2000-03-22 00:00:00 UTC),
            dec!(1),
        );

        let position2 = PortfolioAssetPosition::new(
            dec!(10),
            dec!(3),
            datetime!(2000-03-22 00:00:00 UTC),
            dec!(1),
        );

        portfolio.add_positions(vec![position1, position2]);

        assert_eq!(portfolio.positions.len(), 1);
        assert_eq!(portfolio.positions[0].units(), dec!(5));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(2));
        assert_eq!(portfolio.positions[0].add_price(), dec!(10));
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(0));
    }

    #[tokio::test]
    async fn test_sell_lifo_full() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(3),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(2),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(1),
                ),
            ],
        };

        portfolio.sell_positions(dec!(2), dec!(20), dec!(1));

        assert_eq!(portfolio.positions.len(), 2);
        assert_eq!(portfolio.positions[0].total_fees(), dec!(1));
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(0));

        assert_eq!(portfolio.positions[1].total_fees(), dec!(2));
        assert_eq!(portfolio.positions[1].amount_sold(), dec!(2));
    }

    #[tokio::test]
    async fn test_sell_lifo_partial() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(15),
                    dec!(3),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(2),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(1),
                ),
            ],
        };

        portfolio.sell_positions(dec!(4), dec!(20), dec!(1));

        assert_eq!(portfolio.positions.len(), 2);
        assert_eq!(portfolio.positions[0].total_fees(), dec!(1.5));
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(2));

        assert_eq!(portfolio.positions[1].total_fees(), dec!(1.5));
        assert_eq!(portfolio.positions[1].amount_sold(), dec!(2));
    }

    #[tokio::test]
    async fn test_remove_lifo_full() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(3),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(2),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(1),
                ),
            ],
        };

        let removed_positions = portfolio.remove_positions(dec!(2), dec!(2));

        assert_eq!(portfolio.positions.len(), 1);
        assert_eq!(
            portfolio.positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );

        assert_eq!(removed_positions.len(), 1);
        assert_eq!(removed_positions[0].amount_sold(), dec!(0));

        assert_eq!(removed_positions[0].add_price(), dec!(10));
        assert_eq!(
            removed_positions[0].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(removed_positions[0].total_fees(), dec!(3));
    }

    #[tokio::test]
    async fn test_remove_lifo_partial() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(3),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(2),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(1),
                ),
            ],
        };

        let removed_positions = portfolio.remove_positions(dec!(1), dec!(2));

        assert_eq!(portfolio.positions.len(), 2);
        assert_eq!(
            portfolio.positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(0));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(1));
        assert_eq!(portfolio.positions[0].units(), dec!(3));

        assert_eq!(
            portfolio.positions[1].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[1].amount_sold(), dec!(0));
        assert_eq!(portfolio.positions[1].total_fees(), dec!(0.5));
        assert_eq!(portfolio.positions[1].units(), dec!(1));

        assert_eq!(removed_positions.len(), 1);
        assert_eq!(removed_positions[0].amount_sold(), dec!(0));
        assert_eq!(removed_positions[0].add_price(), dec!(10));
        assert_eq!(
            removed_positions[0].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(removed_positions[0].total_fees(), dec!(2.5));
        assert_eq!(removed_positions[0].units(), dec!(1));
    }

    #[tokio::test]
    async fn test_remove_lifo_full_and_partial() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(8),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(2),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(1),
                ),
            ],
        };

        let removed_positions = portfolio.remove_positions(dec!(4), dec!(2));

        //test remaining positions
        assert_eq!(portfolio.positions.len(), 1);
        assert_eq!(
            portfolio.positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(0));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(0.75));
        assert_eq!(portfolio.positions[0].units(), dec!(6));

        //test removed positions
        assert_eq!(removed_positions.len(), 2);
        assert_eq!(removed_positions[0].amount_sold(), dec!(0));
        assert_eq!(removed_positions[0].add_price(), dec!(10));
        assert_eq!(
            removed_positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(removed_positions[0].total_fees(), dec!(1.25));
        assert_eq!(removed_positions[0].units(), dec!(2));

        assert_eq!(removed_positions[1].amount_sold(), dec!(0));
        assert_eq!(removed_positions[1].add_price(), dec!(10));
        assert_eq!(
            removed_positions[1].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(removed_positions[1].total_fees(), dec!(2));
        assert_eq!(removed_positions[1].units(), dec!(2));
    }

    #[test]
    fn sell_positions_consumes_oldest_lot_first() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(50),
                    dec!(5),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(0),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(5),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(0),
                ),
            ],
        };

        portfolio.sell_positions(dec!(3), dec!(60), dec!(0));

        assert_eq!(portfolio.positions.len(), 2);
        assert_eq!(
            portfolio.positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(0));
        assert_eq!(
            portfolio.positions[1].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[1].amount_sold(), dec!(3));
        assert_eq!(portfolio.realized_gains(), dec!(150));
    }

    #[test]
    fn sell_positions_spills_over_three_lots_oldest_first_with_fee_proration_by_units_sold() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(16),
                    dec!(5),
                    datetime!(2000-01-03 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(12),
                    dec!(3),
                    datetime!(2000-01-02 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(2),
                    datetime!(2000-01-01 00:00:00 UTC),
                    dec!(1),
                ),
            ],
        };

        portfolio.sell_positions(dec!(8), dec!(20), dec!(8));

        assert_eq!(portfolio.positions.len(), 3);

        assert_eq!(
            portfolio.positions[2].add_date(),
            datetime!(2000-01-01 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[2].amount_sold(), dec!(2));
        assert_eq!(portfolio.positions[2].get_amount_left(), dec!(0));
        assert_eq!(portfolio.positions[2].total_fees(), dec!(3));

        assert_eq!(
            portfolio.positions[1].add_date(),
            datetime!(2000-01-02 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[1].amount_sold(), dec!(3));
        assert_eq!(portfolio.positions[1].get_amount_left(), dec!(0));
        assert_eq!(portfolio.positions[1].total_fees(), dec!(4));

        assert_eq!(
            portfolio.positions[0].add_date(),
            datetime!(2000-01-03 00:00:00 UTC)
        );
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(3));
        assert_eq!(portfolio.positions[0].get_amount_left(), dec!(2));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(4));

        assert_eq!(portfolio.realized_gains(), dec!(46.6));
    }

    #[test]
    fn sell_positions_oversell_consumes_all_holdings_and_attaches_only_partial_fee() {
        // Open question 2: oversell surfacing is undecided; today an oversell silently
        // consumes everything held. Fee proration divides by the REQUESTED quantity, so on
        // an oversell only 8 * (5/8) = 5 of the 8 fee attaches; the rest vanishes.
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(5),
                datetime!(2000-03-22 00:00:00 UTC),
                dec!(1),
            )],
        };

        portfolio.sell_positions(dec!(8), dec!(20), dec!(8));

        assert_eq!(portfolio.positions.len(), 1);
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(5));
        assert_eq!(portfolio.positions[0].get_amount_left(), dec!(0));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(6));
        assert_eq!(portfolio.realized_gains(), dec!(44));
    }

    #[test]
    fn remove_positions_oversell_removes_all_holdings_and_attaches_only_partial_fee() {
        // Open question 2: oversell surfacing is undecided; today removing more than is held
        // removes everything. Fee proration divides by the REQUESTED quantity, so on an oversell
        // only 8 * (5/8) = 5 of the 8 transfer fee attaches to the removed lot.
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(5),
                datetime!(2000-03-22 00:00:00 UTC),
                dec!(2),
            )],
        };

        let removed = portfolio.remove_positions(dec!(8), dec!(8));

        assert_eq!(portfolio.positions.len(), 0);
        assert_eq!(removed.len(), 1);
        assert_eq!(removed[0].units(), dec!(5));
        assert_eq!(removed[0].add_price(), dec!(10));
        assert_eq!(removed[0].total_fees(), dec!(7));
    }

    #[test]
    fn add_positions_same_date_different_price_stay_distinct_positions() {
        let mut portfolio = AccountAssetPortfolio::default();

        let position1 = PortfolioAssetPosition::new(
            dec!(10),
            dec!(2),
            datetime!(2000-03-22 00:00:00 UTC),
            dec!(1),
        );
        let position2 = PortfolioAssetPosition::new(
            dec!(20),
            dec!(3),
            datetime!(2000-03-22 00:00:00 UTC),
            dec!(1),
        );

        portfolio.add_positions(vec![position1, position2]);

        assert_eq!(portfolio.positions.len(), 2);
        let cheap = portfolio
            .positions
            .iter()
            .find(|p| p.add_price() == dec!(10))
            .expect("position acquired at price 10");
        let expensive = portfolio
            .positions
            .iter()
            .find(|p| p.add_price() == dec!(20))
            .expect("position acquired at price 20");
        assert_eq!(cheap.units(), dec!(2));
        assert_eq!(cheap.total_fees(), dec!(1));
        assert_eq!(expensive.units(), dec!(3));
        assert_eq!(expensive.total_fees(), dec!(1));
    }

    #[test]
    fn add_positions_merges_into_existing_position_with_same_date_and_price() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(2),
                datetime!(2000-03-22 00:00:00 UTC),
                dec!(1),
            )],
        };

        portfolio.add_positions(vec![PortfolioAssetPosition::new(
            dec!(10),
            dec!(3),
            datetime!(2000-03-22 00:00:00 UTC),
            dec!(2),
        )]);

        assert_eq!(portfolio.positions.len(), 1);
        assert_eq!(portfolio.positions[0].add_price(), dec!(10));
        assert_eq!(portfolio.positions[0].units(), dec!(5));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(3));
        assert_eq!(
            portfolio.positions[0].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
    }

    #[test]
    fn add_positions_does_not_merge_into_existing_position_when_price_differs() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(2),
                datetime!(2000-03-22 00:00:00 UTC),
                dec!(1),
            )],
        };

        portfolio.add_positions(vec![PortfolioAssetPosition::new(
            dec!(20),
            dec!(3),
            datetime!(2000-03-22 00:00:00 UTC),
            dec!(1),
        )]);

        assert_eq!(portfolio.positions.len(), 2);
        let cheap = portfolio
            .positions
            .iter()
            .find(|p| p.add_price() == dec!(10))
            .expect("position acquired at price 10");
        let expensive = portfolio
            .positions
            .iter()
            .find(|p| p.add_price() == dec!(20))
            .expect("position acquired at price 20");
        assert_eq!(cheap.units(), dec!(2));
        assert_eq!(cheap.total_fees(), dec!(1));
        assert_eq!(expensive.units(), dec!(3));
        assert_eq!(expensive.total_fees(), dec!(1));
    }

    #[test]
    fn remove_positions_round_trip_preserves_units_fees_dates_and_prices() {
        let mut source = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(20),
                    dec!(8),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(8),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(4),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(4),
                ),
            ],
        };

        let removed = source.remove_positions(dec!(8), dec!(8));

        let mut destination = AccountAssetPortfolio::default();
        destination.add_positions(removed);

        assert_eq!(destination.positions.len(), 2);
        assert_eq!(
            destination.positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(destination.positions[0].add_price(), dec!(20));
        assert_eq!(destination.positions[0].units(), dec!(4));
        assert_eq!(destination.positions[0].total_fees(), dec!(8));
        assert_eq!(
            destination.positions[1].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(destination.positions[1].add_price(), dec!(10));
        assert_eq!(destination.positions[1].units(), dec!(4));
        assert_eq!(destination.positions[1].total_fees(), dec!(8));

        assert_eq!(source.positions.len(), 1);
        assert_eq!(
            source.positions[0].add_date(),
            datetime!(2000-03-23 00:00:00 UTC)
        );
        assert_eq!(source.positions[0].add_price(), dec!(20));
        assert_eq!(source.positions[0].units(), dec!(4));
        assert_eq!(source.positions[0].total_fees(), dec!(4));

        assert_eq!(source.units() + destination.units(), dec!(12));
        assert_eq!(source.total_fees() + destination.total_fees(), dec!(20));
    }

    #[test]
    fn remove_positions_partial_removal_with_prior_sells_takes_proportional_share_of_fees() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(8),
                datetime!(2000-03-22 00:00:00 UTC),
                dec!(8),
            )],
        };
        portfolio.sell_positions(dec!(4), dec!(20), dec!(0));

        let removed = portfolio.remove_positions(dec!(2), dec!(0));

        assert_eq!(removed.len(), 1);
        assert_eq!(removed[0].units(), dec!(2));
        assert_eq!(removed[0].add_price(), dec!(10));
        assert_eq!(removed[0].add_date(), datetime!(2000-03-22 00:00:00 UTC));
        assert_eq!(removed[0].total_fees(), dec!(2));

        assert_eq!(portfolio.positions.len(), 1);
        assert_eq!(portfolio.positions[0].units(), dec!(6));
        assert_eq!(portfolio.positions[0].amount_sold(), dec!(4));
        assert_eq!(portfolio.positions[0].total_fees(), dec!(6));
    }

    #[test]
    fn get_unit_cost_basis_sums_per_position_unit_costs() {
        // Open question 3: today it SUMS each position's per-unit cost (10 + 20 = 30),
        // not a units-weighted average (15).
        let portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new(
                    dec!(20),
                    dec!(1),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(0),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(1),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(0),
                ),
            ],
        };

        assert_eq!(portfolio.get_unit_cost_basis(), dec!(30));
    }

    #[test]
    fn aggregates_sum_across_lots_and_asset_dividends_count_only_dividend_lots() {
        let mut portfolio = AccountAssetPortfolio {
            cash_dividends: dec!(0),
            positions: vec![
                PortfolioAssetPosition::new_dividend(
                    dec!(5),
                    dec!(3),
                    datetime!(2000-01-03 00:00:00 UTC),
                    dec!(0),
                ),
                PortfolioAssetPosition::new(
                    dec!(20),
                    dec!(2),
                    datetime!(2000-01-02 00:00:00 UTC),
                    dec!(1),
                ),
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(4),
                    datetime!(2000-01-01 00:00:00 UTC),
                    dec!(2),
                ),
            ],
        };
        portfolio.sell_positions(dec!(2), dec!(30), dec!(1));
        portfolio.add_cash_dividends(dec!(10));
        portfolio.add_cash_dividends(dec!(2.5));

        assert_eq!(portfolio.units(), dec!(9));
        assert_eq!(portfolio.total_fees(), dec!(4));
        assert_eq!(portfolio.realized_gains(), dec!(38.5));
        assert_eq!(portfolio.unrealized_gains(dec!(30)), dec!(132.5));
        assert_eq!(portfolio.total_gains(dec!(30)), dec!(171));
        assert_eq!(portfolio.total_cost_basis(), dec!(99));
        assert_eq!(portfolio.asset_dividends(), dec!(3));
        assert_eq!(portfolio.asset_dividends_gains(dec!(30)), dec!(75));
        assert_eq!(portfolio.cash_dividends(), dec!(12.5));
    }

    #[test]
    fn partial_sale_accumulates_fees_and_splits_realized_and_unrealized_gains() {
        let mut portfolio = AccountAssetPortfolio::default();
        portfolio.add_positions(vec![PortfolioAssetPosition::new(
            dec!(100),
            dec!(10),
            datetime!(2024-01-01 00:00:00 UTC),
            dec!(5),
        )]);

        assert_eq!(portfolio.total_cost_basis(), dec!(1005));
        assert_eq!(portfolio.get_unit_cost_basis(), dec!(100.50));

        portfolio.sell_positions(dec!(4), dec!(120), dec!(2));

        assert_eq!(portfolio.total_fees(), dec!(7));
        assert_eq!(portfolio.realized_gains(), dec!(77.20));
        assert_eq!(portfolio.unrealized_gains(dec!(130)), dec!(175.80));
        assert_eq!(portfolio.total_gains(dec!(130)), dec!(253));
    }
}
