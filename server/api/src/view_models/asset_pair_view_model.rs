

use serde::{Deserialize, Serialize};


use super::{asset_rate_view_model::AssetRateViewModel, asset_view_model::AssetViewModel};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetPairViewModel {
    pub pair1: AssetViewModel,
    pub pair2: AssetViewModel,
    pub rates: Vec<AssetRateViewModel>,
}
