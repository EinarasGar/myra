use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::asset_type::IdentifiableAssetTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAssetTypesResponseViewModel {
    pub asset_types: Vec<IdentifiableAssetTypeViewModel>,
}
