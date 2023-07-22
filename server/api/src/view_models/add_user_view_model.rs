use business::dtos::user_dto::AddUserDto;
use serde::Deserialize;

#[typeshare::typeshare]
#[derive(Clone, Debug, Deserialize)]
pub struct AddUserViewModel {
    pub username: String,
    pub password: String,
    pub default_asset_id: i32,
}

impl From<AddUserViewModel> for AddUserDto {
    fn from(p: AddUserViewModel) -> Self {
        Self {
            username: p.username,
            password: p.password,
            default_asset: p.default_asset_id,
        }
    }
}
