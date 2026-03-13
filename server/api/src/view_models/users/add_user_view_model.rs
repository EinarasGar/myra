use business::dtos::add_user_dto::AddUserDto;
use serde::Deserialize;
use utoipa::ToSchema;

use crate::view_models::users::base_models::password::Password;
use crate::view_models::users::base_models::username::Username;

#[derive(Clone, Debug, Deserialize, ToSchema)]
pub struct AddUserViewModel {
    pub username: Username,
    pub password: Password,
}

impl From<AddUserViewModel> for AddUserDto {
    fn from(p: AddUserViewModel) -> Self {
        Self {
            username: p.username.into_inner(),
            password: Some(p.password.into_inner()),
            default_asset: 1, // Default to USD
            assign_default_role: true,
        }
    }
}
