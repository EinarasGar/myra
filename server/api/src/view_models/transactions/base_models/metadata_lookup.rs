use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::{
    asset_view_model::AssetViewModel, portfolio_account_view_model::PortfolioAccountViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct MetadataLookupTables {
    pub accounts: Vec<PortfolioAccountViewModel>,
    pub assets: Vec<AssetViewModel>,
}
