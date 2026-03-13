use sqlx::types::Uuid;

#[derive(Debug, sqlx::FromRow)]
pub struct ExternalIdentityModel {
    pub user_id: Uuid,
    pub username: String,
}
