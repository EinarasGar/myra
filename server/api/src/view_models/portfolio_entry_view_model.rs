use business::dtos::portfolio_dto::PortfolioDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use super::{
    asset_view_model::AssetViewModel, portfolio_account_view_model::PortfolioAccountViewModel,
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioEntryViewModel {
    pub asset: AssetViewModel,
    pub account: PortfolioAccountViewModel,

    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub sum: Decimal,
}

impl From<PortfolioDto> for PortfolioEntryViewModel {
    fn from(p: PortfolioDto) -> Self {
        Self {
            asset: p.asset.into(),
            sum: p.sum,
            account: p.account.into(),
        }
    }
}
