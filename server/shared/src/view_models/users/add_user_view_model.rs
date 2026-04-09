#[cfg(feature = "backend")]
use business::dtos::add_user_dto::AddUserDto;
use serde::Deserialize;

use crate::view_models::users::base_models::password::Password;
use crate::view_models::users::base_models::username::Username;

#[derive(Clone, Debug, Deserialize, utoipa::ToSchema)]
pub struct AddUserViewModel {
    pub username: Username,
    pub password: Password,
}

#[cfg(feature = "backend")]
impl From<AddUserViewModel> for AddUserDto {
    fn from(p: AddUserViewModel) -> Self {
        Self {
            username: p.username.into_inner(),
            password: Some(p.password.into_inner()),
            default_asset: 1,
            assign_default_role: true,
        }
    }
}
