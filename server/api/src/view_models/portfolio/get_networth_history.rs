use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use crate::view_models::assets::base_models::{
    asset_id::RequiredAssetId, rate::AssetRateViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams)]
#[serde(default)]
pub struct GetNetWorthHistoryRequestParams {
    #[param(default = "1d", pattern = "^(1d|1w|1m|3m|6m|1y|all)$")]
    /// The range time for which to retrieve the sums for
    pub range: String,

    #[param(default = "From user settings.")]
    /// The default asset id to use for retrieving current value of units. If not provided, the default asset id from the user will be used
    pub default_asset_id: Option<RequiredAssetId>,
}

impl Default for GetNetWorthHistoryRequestParams {
    fn default() -> Self {
        Self {
            range: "1d".to_string(),
            default_asset_id: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetNetWorthHistoryResponseViewModel {
    #[schema(example = "1d")]
    pub range: String,

    pub sums: Vec<AssetRateViewModel>,
}
