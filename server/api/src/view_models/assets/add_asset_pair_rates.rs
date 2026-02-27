use serde::{Deserialize, Serialize};

use super::base_models::rate::AssetRateViewModel;

use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetPairRatesRequestViewModel {
    pub rates: Vec<AssetRateViewModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetPairRatesResponseViewModel {
    pub rates: Vec<AssetRateViewModel>,
}
