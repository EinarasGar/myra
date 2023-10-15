use business::dtos::portfolio_dto::PortfolioDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    asset_view_model::AssetViewModel, portfolio_entry_view_model::PortfolioEntryViewModel,
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioViewModel {
    pub portfolio_entries: Vec<PortfolioEntryViewModel>,
    pub reference_asset: AssetViewModel,
}

impl From<PortfolioDto> for PortfolioViewModel {
    fn from(p: PortfolioDto) -> Self {
        Self {
            portfolio_entries: p.rows.into_iter().map(|x| x.into()).collect(),
            reference_asset: p.reference_asset.into(),
        }
    }
}
