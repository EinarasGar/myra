use serde::Serialize;

use crate::view_models::assets::base_models::asset::IdentifiableAssetViewModel;
use crate::view_models::users::base_models::user_id::RequiredUserId;

#[derive(Debug, Serialize)]
pub struct UserViewModel {
    pub id: RequiredUserId,
    pub username: String,
    pub default_asset_id: IdentifiableAssetViewModel,
}
