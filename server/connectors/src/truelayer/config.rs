pub struct TrueLayerConfig {
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    pub redirect_uri: Option<String>,
    pub sandbox: bool,
}

impl TrueLayerConfig {
    pub fn get() -> &'static Self {
        static CONFIG: std::sync::OnceLock<TrueLayerConfig> = std::sync::OnceLock::new();
        CONFIG.get_or_init(Self::from_env)
    }

    fn from_env() -> Self {
        Self {
            client_id: std::env::var("TRUELAYER_CLIENT_ID").ok(),
            client_secret: std::env::var("TRUELAYER_CLIENT_SECRET").ok(),
            redirect_uri: std::env::var("TRUELAYER_REDIRECT_URI").ok(),
            sandbox: std::env::var("TRUELAYER_ENV").as_deref() == Ok("sandbox"),
        }
    }
}
