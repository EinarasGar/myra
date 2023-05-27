use sqlx::types::Uuid;

#[derive(Debug)]
pub struct AddUserModel {
    pub id: Uuid,
    pub username: String,
    pub password: String,
    pub default_asset: i32,
    pub role_id: Option<i32>,
}

#[derive(Debug)]
pub struct UserAuthModel {
    pub id: Uuid,
    pub password: String,
    pub role: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct UserFullModel {
    pub id: Uuid,
    pub username: String,
    pub role_id: i32,
    pub role_name: String,
    pub default_asset: i32,
}

#[derive(Debug)]
pub struct UserRoleModel {
    pub id: i32,
    pub name: String,
}
