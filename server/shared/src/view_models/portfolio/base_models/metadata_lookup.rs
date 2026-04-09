use serde::{Deserialize, Serialize};

use crate::view_models::{
    accounts::base_models::account::IdentifiableAccountViewModel,
    assets::base_models::asset::IdentifiableAssetViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct HoldingsMetadataLookupTables {
    pub accounts: Vec<IdentifiableAccountViewModel>,
    pub assets: Vec<IdentifiableAssetViewModel>,
}
