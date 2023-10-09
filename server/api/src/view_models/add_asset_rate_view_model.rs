use serde::{Deserialize, Serialize};

use super::asset_rate_view_model::AssetRateViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddAssetRateViewModel {
    pub rates: Vec<AssetRateViewModel>,
}
