use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InsertAssetResultDto {
    pub new_asset_id: i32,
    pub new_asset_pair_id: Option<i32>,
}
