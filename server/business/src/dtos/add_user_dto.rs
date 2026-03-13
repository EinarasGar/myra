use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct AddUserDto {
    pub username: String,
    pub password: Option<String>,
    pub default_asset: i32,
    pub assign_default_role: bool,
}
