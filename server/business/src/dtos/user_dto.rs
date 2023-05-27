use std::str::FromStr;

use dal::models::user_models::{UserAuthModel, UserFullModel, UserRoleModel};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Deserialize)]
pub struct AddUserDto {
    pub username: String,
    pub password: String,
    pub default_asset: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserFullDto {
    pub id: Uuid,
    pub username: String,
    pub role: UserRoleDto,
    pub default_asset_id: i32,
}

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

impl From<UserFullModel> for UserFullDto {
    fn from(p: UserFullModel) -> Self {
        Self {
            id: p.id,
            username: p.username,
            role: UserRoleModel {
                id: p.role_id,
                name: p.role_name,
            }
            .into(),
            default_asset_id: p.default_asset,
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
