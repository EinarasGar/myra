use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct AddUserDto {
    pub username: String,
    pub password: String,
    pub default_asset: i32,
}
