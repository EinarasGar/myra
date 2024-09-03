use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::{
    accounts::base_models::account::IdentifiableAccountViewModel,
    assets::base_models::asset::IdentifiableAssetViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct MetadataLookupTables {
    pub accounts: Vec<IdentifiableAccountViewModel>,
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
