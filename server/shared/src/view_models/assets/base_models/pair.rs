use serde::{Deserialize, Serialize};

use super::asset::IdentifiableAssetViewModel;

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct IdentifiableAssetPairViewModel {
    pub pair1: IdentifiableAssetViewModel,
    pub pair2: IdentifiableAssetViewModel,
}
