use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};
use time::OffsetDateTime;

#[derive(Clone, Debug)]
pub struct AssetTrade {
    pub date: OffsetDateTime,
}

impl PortfolioAction for AssetTrade {
    fn update_porfolio(&self, _portfolio: &mut Portfolio) {
        todo!()
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}
