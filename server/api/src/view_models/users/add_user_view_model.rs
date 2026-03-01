use business::dtos::add_user_dto::AddUserDto;
use serde::Deserialize;

use crate::view_models::assets::base_models::asset_id::RequiredAssetId;
use crate::view_models::users::base_models::password::Password;
use crate::view_models::users::base_models::username::Username;

#[derive(Clone, Debug, Deserialize)]
pub struct AddUserViewModel {
    pub username: Username,
    pub password: Password,
    pub default_asset_id: RequiredAssetId,
}

impl From<AddUserViewModel> for AddUserDto {
    fn from(p: AddUserViewModel) -> Self {
        Self {
            username: p.username.into_inner(),
            password: p.password.into_inner(),
            default_asset: p.default_asset_id.0,
        }
    }
}
