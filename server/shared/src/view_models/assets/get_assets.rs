use serde::{Deserialize, Serialize};

use super::base_models::asset::IdentifiableAssetViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetAssetsLineResponseViewModel {
    #[serde(flatten)]
    pub asset: IdentifiableAssetViewModel,
}
