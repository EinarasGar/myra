use dal::models::asset_pair::AssetPair;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetPairInsertDto {
    pub pair1: i32,
    pub pair2: i32,
}

impl From<AssetPairInsertDto> for AssetPair {
    fn from(dto: AssetPairInsertDto) -> Self {
        Self {
            pair1: dto.pair1,
            pair2: dto.pair2,
        }
    }
}
