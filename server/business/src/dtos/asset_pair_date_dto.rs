use dal::models::asset_pair_date::AssetPairDate;
use time::OffsetDateTime;

#[derive(Clone, Debug)]
pub struct AssetPairDateDto {
    pub asset1_id: i32,
    pub asset2_id: i32,
    pub date: OffsetDateTime,
}

impl From<AssetPairDateDto> for AssetPairDate {
    fn from(dto: AssetPairDateDto) -> Self {
        Self {
            pair1: dto.asset1_id,
            pair2: dto.asset2_id,
            date: dto.date,
        }
    }
}
