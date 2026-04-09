use serde::{Deserialize, Serialize};

use super::asset_type::IdentifiableAssetTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, Default, utoipa::ToSchema)]
pub struct AssetLookupTables {
    pub asset_types: Vec<IdentifiableAssetTypeViewModel>,
}
