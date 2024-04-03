use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    assets::base_models::{asset::IdentifiableAssetViewModel, rate::AssetRateViewModel},
    portfolio_account_view_model::PortfolioAccountViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioEntryViewModel {
    pub asset: IdentifiableAssetViewModel,
    pub base_asset: Option<IdentifiableAssetViewModel>,
    pub account: PortfolioAccountViewModel,

    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub sum: Decimal,
    pub last_rate: Option<AssetRateViewModel>,
    pub last_reference_rate: Option<AssetRateViewModel>,
    pub sum_of_costs: Option<Decimal>,
}

// impl From<PortfolioRowDto> for PortfolioEntryViewModel {
//     fn from(p: PortfolioRowDto) -> Self {
//         Self {
//             asset: p.asset.into(),
//             account: p.account.into(),
//             sum: p.sum,
//             last_rate: p.last_rate.map(|rate| rate.into()),
//             last_reference_rate: p.last_reference_rate.map(|rate| rate.into()),
//             base_asset: p.base_asset.map(|asset| asset.into()),
//             sum_of_costs: p.sum_of_cost,
//         }
//     }
// }
