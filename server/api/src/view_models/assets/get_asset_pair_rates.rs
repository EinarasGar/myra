use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use super::base_models::rate::AssetRateViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams)]
#[serde(default)]
pub struct GetAssetPairRatesRequestParams {
    #[param(default = "1d", pattern = "^(1d|1w|1m|3m|6m|1y|all)$")]
    /// The range time for which to retrieve the rates for
    pub range: String,
}

impl Default for GetAssetPairRatesRequestParams {
    fn default() -> Self {
        Self {
            range: "1d".to_string(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAssetPairRatesResponseViewModel {
    pub rates: Vec<AssetRateViewModel>,

    #[schema(example = "1d")]
    pub range: String,
}
