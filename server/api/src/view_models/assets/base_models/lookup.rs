use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_type::IdentifiableAssetTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetLookupTables {
    pub asset_types: Vec<IdentifiableAssetTypeViewModel>,
}

impl Default for AssetLookupTables {
    fn default() -> Self {
        Self {
            asset_types: Vec::new(),
        }
    }
}
