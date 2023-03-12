use std::str::FromStr;

use sea_query::Iden;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

pub struct User {
    pub id: Uuid,
    pub username: String,
    pub password: String,
    pub default_asset: i32,
}

pub struct UserAuth {
    pub id: Uuid,
    pub password: String,
    pub role: String,
}

pub enum Users {
    Table,
    Id,
    Username,
    Password,
    DefaultAssset,
    Role,
}

pub enum UserRoles {
    Table,
    Id,
    Name,
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

impl Iden for Users {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "users",
                Self::Id => "id",
                Self::Username => "username",
                Self::Password => "password",
                Self::DefaultAssset => "default_asset",
                Self::Role => "role",
            }
        )
        .unwrap();
    }
}

impl Iden for UserRoles {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "user_roles",
                Self::Id => "id",
                Self::Name => "name",
            }
        )
        .unwrap();
    }
}
