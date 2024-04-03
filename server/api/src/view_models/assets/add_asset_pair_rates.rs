use serde::{Deserialize, Serialize};

use super::base_models::rate::AssetRateViewModel;

use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetPairRatesRequestViewModel {
    rates: Vec<AssetRateViewModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAssetPairRatesResponseViewModel {
    rates: Vec<AssetRateViewModel>,
}
