use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::{
    assets::base_models::asset::IdentifiableAssetViewModel,
    portfolio_account_view_model::PortfolioAccountViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct MetadataLookupTables {
    pub accounts: Vec<PortfolioAccountViewModel>,
    pub assets: Vec<IdentifiableAssetViewModel>,
}

impl Default for MetadataLookupTables {
    fn default() -> Self {
        Self {
            accounts: Vec::new(),
            assets: Vec::new(),
        }
    }
}
