use std::str::FromStr;

use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimsDto {
    #[serde(with = "Uuid")]
    pub sub: Uuid,
    pub role: AuthRolesDto,
    pub exp: u64,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum AuthRolesDto {
    Admin,
    User,
}

impl FromStr for AuthRolesDto {
    type Err = anyhow::Error;

    fn from_str(input: &str) -> Result<AuthRolesDto, Self::Err> {
        match input {
            "User" => Ok(AuthRolesDto::User),
            "Admin" => Ok(AuthRolesDto::Admin),
            _ => Err(anyhow::anyhow!("Role {} is not mapped in code", input)),
        }
    }
}