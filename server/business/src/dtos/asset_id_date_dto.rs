use time::OffsetDateTime;

#[derive(Clone, Debug)]
pub struct AssetIdDateDto {
    pub asset_id: i32,
    pub date: OffsetDateTime,
}
