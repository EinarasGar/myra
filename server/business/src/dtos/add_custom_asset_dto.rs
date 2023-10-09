use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddCustomAssetDto {
    pub ticker: String,
    pub name: String,
    pub asset_type: i32,
    pub base_pair_id: i32,
    pub user_id: Uuid,
}
