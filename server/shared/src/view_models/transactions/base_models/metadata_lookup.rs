use serde::{Deserialize, Serialize};

use crate::view_models::{
    accounts::base_models::account::IdentifiableAccountViewModel,
    assets::base_models::asset::IdentifiableAssetViewModel,
    categories::base_models::category::IdentifiableCategoryViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, Default, utoipa::ToSchema)]
pub struct MetadataLookupTables {
    pub accounts: Vec<IdentifiableAccountViewModel>,
    pub assets: Vec<IdentifiableAssetViewModel>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub categories: Vec<IdentifiableCategoryViewModel>,
}
