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
pub struct AssetDividend {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub price: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for AssetDividend {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let position =
            PortfolioAssetPosition::new_dividend(self.price, self.quantity, self.date, self.fees);

        portfolio
            .get_asset_portfolio(self.account_id, self.asset_id)
            .add_positions(vec![position]);
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
}
