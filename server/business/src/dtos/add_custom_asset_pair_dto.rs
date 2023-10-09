use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddCustomAssetPairDto {
    pub pair1: i32,
    pub pair2: i32,
}
