use serde::{Deserialize, Serialize};

use super::base_models::rate::AssetRateViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddAssetPairRatesRequestViewModel {
    pub rates: Vec<AssetRateViewModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddAssetPairRatesResponseViewModel {
    pub rates: Vec<AssetRateViewModel>,
}
