use uuid::Uuid;

pub struct UpdateAssetDto {
    pub asset_id: i32,
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub base_pair_id: i32,
    pub user_id: Uuid,
}
