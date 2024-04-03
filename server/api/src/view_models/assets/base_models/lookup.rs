use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_type::IdentifiableAssetTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetLookupTables {
    pub asset_types: Vec<IdentifiableAssetTypeViewModel>,
}
