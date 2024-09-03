use serde::Serialize;
use uuid::Uuid;

use crate::view_models::assets::base_models::asset::IdentifiableAssetViewModel;

#[derive(Debug, Serialize)]
pub struct UserViewModel {
    pub id: Uuid,
    pub username: String,
    pub default_asset_id: IdentifiableAssetViewModel,
}
