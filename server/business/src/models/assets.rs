use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetDto {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub asset_id: i32,
}
