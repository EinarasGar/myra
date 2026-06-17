use serde::{Deserialize, Serialize};

use super::base_models::asset::IdentifiableAssetViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(default)]
pub struct GetAssetsRequestParams {
    #[param(maximum = 100, minimum = 1, example = 10)]
    /// How many items to return in a single page
    pub count: u64,

    /// The index in the list of the fist element of the page.
    #[param(minimum = 0, example = 30)]
    pub start: u64,

    /// The search query
    pub query: Option<String>,

    /// Filter by asset type id
    pub asset_type: Option<i32>,
}

impl Default for GetAssetsRequestParams {
    fn default() -> Self {
        Self {
            count: 10,
            start: 0,
            query: None,
            asset_type: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetAssetsLineResponseViewModel {
    #[serde(flatten)]
    pub asset: IdentifiableAssetViewModel,
}
