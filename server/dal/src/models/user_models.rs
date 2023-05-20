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
