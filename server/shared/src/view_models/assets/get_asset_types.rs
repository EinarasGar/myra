use serde::{Deserialize, Serialize};

use super::base_models::asset_type::IdentifiableAssetTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetAssetTypesResponseViewModel {
    pub asset_types: Vec<IdentifiableAssetTypeViewModel>,
}
