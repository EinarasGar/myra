use serde::{Deserialize, Serialize};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AddAssetViewModel {
    pub ticker: String,
    pub name: String,
    pub type_id: i32,
    pub base_asset_id: i32,
}
