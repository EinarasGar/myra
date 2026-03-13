use sqlx::types::Uuid;

#[derive(Debug)]
pub struct AddUserModel {
    pub username: String,
    pub default_asset: i32,
}

#[derive(Debug, sqlx::FromRow)]
pub struct UserAuthModel {
    pub id: Uuid,
    pub password_hash: String,
    pub user_role_name: String,
    pub username: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct UserFullModel {
    pub id: Uuid,
    pub username: String,
    pub role_id: i32,
    pub role_name: String,
    pub default_asset: i32,
}

#[derive(Debug, sqlx::FromRow)]
pub struct UserBasicModel {
    pub id: Uuid,
    pub username: String,
    pub default_asset: i32,
}

#[derive(Debug, sqlx::FromRow)]
pub struct UserRoleModel {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct RefreshTokenModel {
    pub id: i32,
    pub user_id: Uuid,
    pub token_hash: String,
    pub expires_at: sqlx::types::time::OffsetDateTime,
}
