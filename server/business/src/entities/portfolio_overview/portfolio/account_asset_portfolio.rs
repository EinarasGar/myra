use std::collections::HashMap;

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use time::OffsetDateTime;
use tracing::error;

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
            // Merge positions in the vec that have same date and price
            positions = positions
                .iter_mut()
                .fold(
                    HashMap::new(),
                    |mut acc: HashMap<OffsetDateTime, PortfolioAssetPosition>, position| {
                        if let Some(existing_position) = acc.get_mut(&position.add_date()) {
                            existing_position.merge(position);
                        } else {
                            acc.insert(position.add_date(), position.clone());
                        }
                        acc
                    },
                )
                .into_values()
                .collect();
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

                let sale_fees = fees * (amount_selling / quantity);
                position.sell(amount_selling, price, sale_fees);
                left_to_sell -= amount_selling;
            } else {
                error!("Not enough assets to sell");
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
                .rev()
                .position(|x| x.get_amount_left() > dec!(0))
                .map(|index| self.positions.len() - 1 - index)
            {
                let position = self.positions.get_mut(position_index).unwrap();
                let amount_left_in_position = position.get_amount_left();
                let amount_transfering = if amount_left_in_position < left_to_remove {
                    amount_left_in_position
                } else {
                    left_to_remove
                };

                left_to_remove -= amount_transfering;
                let position_percentage_transfering = amount_transfering / amount_left_in_position;
                let removal_percentage_transfering = amount_transfering / quantity;

                // A case where position does not have sold assets - we are transfeing full position
                if amount_left_in_position == amount_transfering {
                    let mut transfered_position = position.clone();
                    transfered_position.add_fees(fees * removal_percentage_transfering);
                    removed_positions.push(transfered_position);
                    self.positions.remove(position_index);
                    continue;
                }

                let transfered_postion = PortfolioAssetPosition::new(
                    position.add_price(),
                    amount_transfering,
                    position.add_date(),
                    position.total_fees() * position_percentage_transfering
                        + fees * removal_percentage_transfering,
                );
                position.add_quantity(
                    -amount_transfering,
                    -position.total_fees() * position_percentage_transfering,
                );
                removed_positions.push(transfered_postion);
            } else {
                error!("Not enough assets to transfer");
                break;
            }
        }
        self.sort();
        removed_positions.sort_by(|a, b| b.compare_by_date(a));
        removed_positions
    }

    pub fn units(&self) -> Decimal {
        self.positions.iter().map(|x| x.units()).sum()
    }

    pub fn total_fees(&self) -> Decimal {
        self.positions.iter().map(|x| x.total_fees()).sum()
    }

    pub fn realized_gains(&self) -> Decimal {
        self.positions.iter().map(|x| x.get_realized_gains()).sum()
    }

    pub fn unrealized_gains(&self, current_rate: Decimal) -> Decimal {
        self.positions
            .iter()
            .map(|x| x.get_unrealized_gains(current_rate))
            .sum()
    }

    pub fn total_gains(&self, current_rate: Decimal) -> Decimal {
        self.positions
            .iter()
            .map(|x| x.get_total_gains(current_rate))
            .sum()
    }

    pub fn total_cost_basis(&self) -> Decimal {
        self.positions
            .iter()
            .map(|x| x.get_total_cost_basis())
            .sum()
    }

    pub fn get_unit_cost_basis(&self) -> Decimal {
        self.positions.iter().map(|x| x.get_unit_cost_basis()).sum()
    }

    pub fn asset_dividends(&self) -> Decimal {
        self.positions
            .iter()
            .filter(|x| x.is_dividend())
            .map(|x| x.units())
            .sum()
    }

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
}
