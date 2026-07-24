pub struct OAuthSessionStartDto {
    pub session_id: String,
    pub auth_url: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct OAuthSessionStateDto {
    pub state: String,
    pub redirect_uri: Option<String>,
}
