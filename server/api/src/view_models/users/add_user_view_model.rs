use business::dtos::add_user_dto::AddUserDto;
use serde::Deserialize;

use crate::view_models::assets::base_models::asset_id::RequiredAssetId;

#[derive(Clone, Debug, Deserialize)]
pub struct AddUserViewModel {
    pub username: String,
    pub password: String,
    pub default_asset_id: RequiredAssetId,
}

impl From<AddUserViewModel> for AddUserDto {
    fn from(p: AddUserViewModel) -> Self {
        Self {
            username: p.username,
            password: p.password,
            default_asset: p.default_asset_id.0,
        }
    }
}
