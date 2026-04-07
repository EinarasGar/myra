pub mod asset_portfolio;
pub mod asset_portfolio_position;
pub mod cash_portfolio;
pub mod portfolio_overview;

use portfolio_overview::PortfolioOverviewViewModel;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use super::base_models::metadata_lookup::HoldingsMetadataLookupTables;

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams, ToSchema)]
#[into_params(parameter_in = Query)]
pub struct GetPortfolioOverviewQueryParams {
    /// The default asset id to use for retrieving current value of units. If not provided, the default asset id from the user will be used
    #[serde(default)]
    pub default_asset_id: Option<i32>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetPortfolioOverviewViewModel {
    pub portfolios: PortfolioOverviewViewModel,
    pub lookup_tables: HoldingsMetadataLookupTables,
}
