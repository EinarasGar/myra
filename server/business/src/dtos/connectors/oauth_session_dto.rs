pub struct OAuthSessionStartDto {
    pub session_id: String,
    pub auth_url: String,
    pub state: String,
}

#[derive(Debug, Clone, Default)]
pub struct BeginOauthOptionsDto {
    pub bank_name: Option<String>,
    pub bank_country: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct OAuthSessionStateDto {
    pub state: String,
    pub redirect_uri: Option<String>,
}
