use dal::models::asset_models::AssetPair;

use super::asset_id_dto::AssetIdDto;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct AssetPairIdsDto {
    pub pair1: AssetIdDto,
    pub pair2: AssetIdDto,
}

impl AssetPairIdsDto {
    pub fn new(pair1: AssetIdDto, pair2: AssetIdDto) -> Self {
        Self { pair1, pair2 }
    }
}

impl From<AssetPairIdsDto> for AssetPair {
    fn from(dto: AssetPairIdsDto) -> Self {
        Self {
            pair1: dto.pair1.0,
            pair2: dto.pair2.0,
        }
    }
}
