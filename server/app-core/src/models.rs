#[derive(Debug, Clone, uniffi::Record)]
pub struct ApiResponse {
    pub status: u16,
    pub body: String,
}

#[derive(Debug, Clone, serde::Deserialize, uniffi::Record)]
pub struct AuthMe {
    pub user_id: String,
    pub default_asset_id: i32,
    pub role: String,
    pub user_metadata: Option<UserMetadata>,
}

#[derive(Debug, Clone, serde::Deserialize, uniffi::Record)]
pub struct UserMetadata {
    pub username: String,
    pub image_url: Option<String>,
}
