pub mod asset_portfolio;
pub mod asset_portfolio_position;
pub mod cash_portfolio;
pub mod portfolio_overview;

use portfolio_overview::PortfolioOverviewViewModel;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use crate::view_models::assets::base_models::asset_id::AssetId;

use super::base_models::metadata_lookup::HoldingsMetadataLookupTables;

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams, ToSchema)]
pub struct GetPortfolioOverviewQueryParams {
    #[param(default = "From user settings.")]
    /// The default asset id to use for retrieving current value of units. If not provided, the default asset id from the user will be used
    pub default_asset_id: AssetId,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetPortfolioOverviewViewModel {
    pub portfolios: PortfolioOverviewViewModel,
    pub lookup_tables: HoldingsMetadataLookupTables,
}
