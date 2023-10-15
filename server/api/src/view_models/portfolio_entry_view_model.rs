use business::dtos::portfolio_row_dto::PortfolioRowDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    asset_rate_view_model::AssetRateViewModel, asset_view_model::AssetViewModel,
    portfolio_account_view_model::PortfolioAccountViewModel,
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioEntryViewModel {
    pub asset: AssetViewModel,
    pub base_asset: Option<AssetViewModel>,
    pub account: PortfolioAccountViewModel,

    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub sum: Decimal,
    pub last_rate: Option<AssetRateViewModel>,
    pub last_reference_rate: Option<AssetRateViewModel>,
}

impl From<PortfolioRowDto> for PortfolioEntryViewModel {
    fn from(p: PortfolioRowDto) -> Self {
        Self {
            asset: p.asset.into(),
            account: p.account.into(),
            sum: p.sum,
            last_rate: p.last_rate.map(|rate| rate.into()),
            last_reference_rate: p.last_reference_rate.map(|rate| rate.into()),
            base_asset: p.base_asset.map(|asset| asset.into()),
        }
    }
}
