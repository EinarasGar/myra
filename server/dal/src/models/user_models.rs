use std::str::FromStr;

use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

#[derive(Debug)]
pub struct UserModel {
    pub id: Uuid,
    pub username: String,
    pub password: String,
    pub default_asset: i32,
}

#[derive(Debug)]
pub struct UserAuthModel {
    pub id: Uuid,
    pub password: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum AuthRoles {
    Admin,
    User,
}

impl FromStr for AuthRoles {
    type Err = anyhow::Error;

    fn from_str(input: &str) -> Result<AuthRoles, Self::Err> {
        match input {
            "User" => Ok(AuthRoles::User),
            "Admin" => Ok(AuthRoles::Admin),
            _ => Err(anyhow::anyhow!("Role {} is not mapped in code", input)),
        }
    }
}
