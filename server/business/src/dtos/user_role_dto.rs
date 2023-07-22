use std::str::FromStr;

use dal::models::user_models::UserRoleModel;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserRoleDto {
    pub role_id: i32,
    pub role: UserRoleEnumDto,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum UserRoleEnumDto {
    Admin,
    User,
}

impl FromStr for UserRoleEnumDto {
    type Err = anyhow::Error;

    fn from_str(input: &str) -> Result<UserRoleEnumDto, Self::Err> {
        match input {
            "User" => Ok(UserRoleEnumDto::User),
            "Admin" => Ok(UserRoleEnumDto::Admin),
            _ => Err(anyhow::anyhow!("Role {} is not mapped in code", input)),
        }
    }
}

impl From<UserRoleModel> for UserRoleDto {
    fn from(p: UserRoleModel) -> Self {
        Self {
            role_id: p.id,
            role: UserRoleEnumDto::from_str(&p.name).unwrap(),
        }
    }
}
