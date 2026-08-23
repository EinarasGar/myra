use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock, RwLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use crate::api::cache::PersistentCache;
use crate::error::ApiError;
use crate::models::{ApiResponse, AuthMe, AuthMode};
use crate::store::CredentialStore;

pub type OnOfflineChangedCallback = Arc<dyn Fn() + Send + Sync>;
pub type OnAuthExpiredCallback = Arc<dyn Fn() + Send + Sync>;

fn tls_config() -> &'static rustls::ClientConfig {
    static CONFIG: OnceLock<rustls::ClientConfig> = OnceLock::new();
    CONFIG.get_or_init(|| {
        let mut root_store = rustls::RootCertStore::empty();
        root_store
            .add_parsable_certificates(webpki_root_certs::TLS_SERVER_ROOT_CERTS.iter().cloned());
        rustls::ClientConfig::builder()
            .with_root_certificates(root_store)
            .with_no_client_auth()
    })
}

struct CacheEntry {
    body: String,
    inserted_at: Instant,
}

struct DatabaseSession {
    refresh_token: String,
    access_token: Option<String>,
    expires_at: Option<SystemTime>,
}

pub struct SharedInfra {
    base_url: RwLock<String>,
    pub http: reqwest::Client,
    pub http_stream: reqwest::Client,
    cache: Mutex<HashMap<String, CacheEntry>>,
    cache_ttl: Duration,
    pub persistent_cache: PersistentCache,
    pub connectivity: AtomicBool,
    pub is_offline: AtomicBool,
    pub user_id: Mutex<Option<String>>,
    pub default_asset_id: Mutex<Option<i32>>,
    pub default_asset_ticker: Mutex<Option<String>>,
    pub onboarding_version: Mutex<Option<i32>>,
    pub db_path: String,
    on_offline_changed: Mutex<Option<OnOfflineChangedCallback>>,
    pub auth_provider: Arc<dyn crate::store::AuthProvider>,
    pub credential_store: Arc<dyn CredentialStore>,
    pub auth_mode: Mutex<AuthMode>,
    database_session: Mutex<Option<DatabaseSession>>,
    auth_invalidated: AtomicBool,
    on_auth_expired: Mutex<Option<OnAuthExpiredCallback>>,
    refresh_lock: tokio::sync::Mutex<()>,
}

impl SharedInfra {
    pub fn new(
        base_url: String,
        cache_ttl_secs: u64,
        db_path: String,
        auth_provider: Arc<dyn crate::store::AuthProvider>,
        credential_store: Arc<dyn CredentialStore>,
    ) -> Self {
        let http = reqwest::Client::builder()
            .use_preconfigured_tls(tls_config().clone())
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");

        let http_stream = reqwest::Client::builder()
            .use_preconfigured_tls(tls_config().clone())
            .connect_timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build streaming HTTP client");

        let persistent_cache = PersistentCache::open(&db_path);

        Self {
            base_url: RwLock::new(base_url),
            http,
            http_stream,
            cache: Mutex::new(HashMap::new()),
            cache_ttl: Duration::from_secs(cache_ttl_secs),
            persistent_cache,
            connectivity: AtomicBool::new(true),
            is_offline: AtomicBool::new(false),
            user_id: Mutex::new(None),
            default_asset_id: Mutex::new(None),
            default_asset_ticker: Mutex::new(None),
            onboarding_version: Mutex::new(None),
            db_path,
            on_offline_changed: Mutex::new(None),
            auth_provider,
            credential_store,
            auth_mode: Mutex::new(AuthMode::Noauth),
            database_session: Mutex::new(None),
            auth_invalidated: AtomicBool::new(false),
            on_auth_expired: Mutex::new(None),
            refresh_lock: tokio::sync::Mutex::new(()),
        }
    }

    pub fn base_url(&self) -> String {
        self.base_url.read().unwrap().clone()
    }

    pub fn set_base_url(&self, url: String) {
        *self.base_url.write().unwrap() = url;
    }

    pub fn set_auth_mode(&self, mode: AuthMode) {
        *self.auth_mode.lock().unwrap() = mode;
    }

    pub fn set_on_offline_changed(&self, callback: OnOfflineChangedCallback) {
        *self.on_offline_changed.lock().unwrap() = Some(callback);
    }

    pub fn set_on_auth_expired(&self, callback: OnAuthExpiredCallback) {
        *self.on_auth_expired.lock().unwrap() = Some(callback);
    }

    pub fn database_session_is_some(&self) -> bool {
        self.database_session.lock().unwrap().is_some()
    }

    pub fn set_database_session(&self, refresh_token: String, access_token: Option<String>) {
        let expires_at = access_token.as_ref().and_then(|t| parse_jwt_exp(t));
        *self.database_session.lock().unwrap() = Some(DatabaseSession {
            refresh_token,
            access_token,
            expires_at,
        });
    }

    pub fn clear_database_session(&self) {
        *self.database_session.lock().unwrap() = None;
    }

    pub fn database_session_refresh_token(&self) -> Option<String> {
        self.database_session
            .lock()
            .unwrap()
            .as_ref()
            .map(|s| s.refresh_token.clone())
    }

    pub async fn get_auth_token(&self) -> Option<String> {
        let mode = self.auth_mode.lock().unwrap().clone();
        match mode {
            AuthMode::Clerk => self.auth_provider.get_token().await,
            AuthMode::Noauth => None,
            AuthMode::Database => self.get_database_access_token().await,
        }
    }

    async fn get_database_access_token(&self) -> Option<String> {
        {
            let session = self.database_session.lock().unwrap();
            if let Some(ref s) = *session {
                let valid = !self.auth_invalidated.load(Ordering::Relaxed)
                    && s.access_token.as_ref().is_some_and(|t| {
                        parse_jwt_exp(t).is_some_and(|exp| {
                            exp.duration_since(SystemTime::now())
                                .is_ok_and(|d| d > Duration::from_secs(60))
                        })
                    });
                if valid {
                    return s.access_token.clone();
                }
            }
        }

        let _guard = self.refresh_lock.lock().await;

        {
            let session = self.database_session.lock().unwrap();
            if let Some(ref s) = *session {
                let valid = !self.auth_invalidated.load(Ordering::Relaxed)
                    && s.access_token.as_ref().is_some_and(|t| {
                        parse_jwt_exp(t).is_some_and(|exp| {
                            exp.duration_since(SystemTime::now())
                                .is_ok_and(|d| d > Duration::from_secs(60))
                        })
                    });
                if valid {
                    return s.access_token.clone();
                }
            }
        }

        let refresh_token = {
            let session = self.database_session.lock().unwrap();
            session.as_ref().map(|s| s.refresh_token.clone())
        };

        let refresh_token = match refresh_token {
            Some(t) => t,
            None => return None,
        };

        let url = format!("{}/api/auth/refresh", self.base_url());
        let body = serde_json::json!({ "refresh_token": refresh_token });

        let result = self
            .http
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-Sverto-Client", "native")
            .body(body.to_string())
            .send()
            .await;

        match result {
            Ok(resp) => {
                let status = resp.status().as_u16();
                let text = resp.text().await.unwrap_or_default();
                if status >= 400 {
                    *self.database_session.lock().unwrap() = None;
                    self.auth_invalidated.store(true, Ordering::Relaxed);
                    self.credential_store.clear_refresh_token();
                    if let Some(cb) = self.on_auth_expired.lock().unwrap().as_ref() {
                        cb();
                    }
                    return None;
                }

                let v: serde_json::Value = serde_json::from_str(&text).ok()?;
                let access_token = v["token"].as_str()?.to_string();
                let new_refresh = v["refresh_token"].as_str().map(|s| s.to_string());
                let expires_at = parse_jwt_exp(&access_token);

                let rt = new_refresh.unwrap_or(refresh_token);
                self.credential_store.save_refresh_token(rt.clone());
                *self.database_session.lock().unwrap() = Some(DatabaseSession {
                    refresh_token: rt,
                    access_token: Some(access_token.clone()),
                    expires_at,
                });
                self.auth_invalidated.store(false, Ordering::Relaxed);
                Some(access_token)
            }
            Err(_) => {
                let session = self.database_session.lock().unwrap();
                session.as_ref().and_then(|s| s.access_token.clone())
            }
        }
    }

    pub fn set_is_offline(&self, offline: bool) {
        let prev = self.is_offline.swap(offline, Ordering::Relaxed);
        if prev != offline {
            if let Some(cb) = self.on_offline_changed.lock().unwrap().as_ref() {
                cb();
            }
        }
    }

    pub fn user_id(&self) -> Option<String> {
        self.user_id.lock().unwrap().clone()
    }

    pub fn default_asset_id(&self) -> Option<i32> {
        *self.default_asset_id.lock().unwrap()
    }

    pub fn set_default_asset_id(&self, id: i32) {
        *self.default_asset_id.lock().unwrap() = Some(id);
    }

    pub fn default_asset_ticker(&self) -> Option<String> {
        self.default_asset_ticker.lock().unwrap().clone()
    }

    pub fn set_default_asset_ticker(&self, ticker: String) {
        *self.default_asset_ticker.lock().unwrap() = Some(ticker);
    }

    pub fn onboarding_version(&self) -> Option<i32> {
        *self.onboarding_version.lock().unwrap()
    }

    pub fn set_onboarding_version(&self, version: i32) {
        *self.onboarding_version.lock().unwrap() = Some(version);
    }

    pub fn apply_auth_me(&self, auth_me: &AuthMe) {
        *self.user_id.lock().unwrap() = Some(auth_me.user_id.clone());
        *self.default_asset_id.lock().unwrap() =
            auth_me.default_asset.as_ref().map(|asset| asset.id);
        *self.default_asset_ticker.lock().unwrap() = auth_me
            .default_asset
            .as_ref()
            .map(|asset| asset.ticker.clone());
        *self.onboarding_version.lock().unwrap() = Some(auth_me.onboarding_version);
    }

    pub fn has_connectivity(&self) -> bool {
        self.connectivity.load(Ordering::Relaxed)
    }

    pub fn clear_memory_cache(&self) {
        self.cache.lock().unwrap().clear();
    }

    pub fn clear_all_cache(&self) {
        self.clear_memory_cache();
        self.persistent_cache.clear();
    }

    pub fn evict_memory_cache(&self, url_suffix: &str) {
        let url = format!("{}{}", self.base_url(), url_suffix);
        self.cache.lock().unwrap().remove(&url);
    }

    pub fn evict_memory_cache_prefix(&self, url_prefix: &str) {
        let prefix = format!("{}{}", self.base_url(), url_prefix);
        self.cache
            .lock()
            .unwrap()
            .retain(|k, _| !k.starts_with(&prefix));
    }

    pub async fn get(&self, path: &str, auth_token: Option<&str>) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url(), path);

        // 1. Check memory cache (TTL-based)
        if self.cache_ttl.as_secs() > 0 {
            let cache = self.cache.lock().unwrap();
            if let Some(entry) = cache.get(&url) {
                if entry.inserted_at.elapsed() < self.cache_ttl {
                    return Ok(ApiResponse {
                        status: 200,
                        body: entry.body.clone(),
                    });
                }
            }
        }

        // 2. If no connectivity, serve from persistent cache
        if !self.has_connectivity() {
            return self.serve_from_persistent_cache(&url);
        }

        // 3. Check persistent cache for stale data
        let cached_body = self.persistent_cache.get(&url);

        let result = if cached_body.is_some() {
            // If we have cached data, use short timeout
            self.do_request(
                reqwest::Method::GET,
                &url,
                None,
                auth_token,
                Some(Duration::from_secs(5)),
            )
            .await
        } else {
            self.do_request(reqwest::Method::GET, &url, None, auth_token, None)
                .await
        };

        match result {
            Ok(response) => {
                // On success: store in persistent cache, clear is_offline, store in memory cache
                self.persistent_cache.put(&url, &response.body);
                self.set_is_offline(false);
                if self.cache_ttl.as_secs() > 0 {
                    let mut cache = self.cache.lock().unwrap();
                    cache.insert(
                        url,
                        CacheEntry {
                            body: response.body.clone(),
                            inserted_at: Instant::now(),
                        },
                    );
                }
                Ok(response)
            }
            Err(ref err) => {
                if let Some(body) = cached_body {
                    // On failure with cached body: if unreachable, set is_offline, return cached
                    if err.is_unreachable() {
                        self.set_is_offline(true);
                    }
                    Ok(ApiResponse { status: 200, body })
                } else {
                    // On failure without cache: return error
                    Err(err.clone())
                }
            }
        }
    }

    pub async fn post(
        &self,
        path: &str,
        body: &str,
        auth_token: Option<&str>,
    ) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url(), path);
        self.do_request(reqwest::Method::POST, &url, Some(body), auth_token, None)
            .await
    }

    pub async fn put(
        &self,
        path: &str,
        body: &str,
        auth_token: Option<&str>,
    ) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url(), path);
        self.do_request(reqwest::Method::PUT, &url, Some(body), auth_token, None)
            .await
    }

    pub async fn delete(
        &self,
        path: &str,
        auth_token: Option<&str>,
    ) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url(), path);
        self.do_request(reqwest::Method::DELETE, &url, None, auth_token, None)
            .await
    }

    pub async fn delete_with_body(
        &self,
        path: &str,
        body: &str,
        auth_token: Option<&str>,
    ) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url(), path);
        self.do_request(reqwest::Method::DELETE, &url, Some(body), auth_token, None)
            .await
    }

    fn serve_from_persistent_cache(&self, url: &str) -> Result<ApiResponse, ApiError> {
        if let Some(body) = self.persistent_cache.get(url) {
            self.set_is_offline(true);
            Ok(ApiResponse { status: 200, body })
        } else {
            Err(ApiError::Network {
                reason: "no connectivity and no cached data".into(),
            })
        }
    }

    async fn do_request(
        &self,
        method: reqwest::Method,
        url: &str,
        body: Option<&str>,
        auth_token: Option<&str>,
        timeout: Option<Duration>,
    ) -> Result<ApiResponse, ApiError> {
        let mut req = self.http.request(method, url);
        if let Some(token) = auth_token {
            req = req.bearer_auth(token);
        }
        if let Some(t) = timeout {
            req = req.timeout(t);
        }
        if let Some(b) = body {
            req = req
                .header("Content-Type", "application/json")
                .body(b.to_owned());
        }

        let resp = req.send().await?;
        let status = resp.status().as_u16();
        let text = resp.text().await.map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

        if status >= 500 {
            return Err(ApiError::Server {
                reason: format!("HTTP {status}"),
                status,
            });
        }

        Ok(ApiResponse { status, body: text })
    }
}

fn parse_jwt_exp(token: &str) -> Option<SystemTime> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let payload = base64_url_decode(parts[1])?;
    let v: serde_json::Value = serde_json::from_slice(&payload).ok()?;
    let exp = v["exp"].as_i64()?;
    UNIX_EPOCH.checked_add(Duration::from_secs(exp as u64))
}

fn base64_url_decode(input: &str) -> Option<Vec<u8>> {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(input)
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::AuthProvider;

    struct AsyncAuthProvider;

    #[async_trait::async_trait]
    impl AuthProvider for AsyncAuthProvider {
        async fn get_token(&self) -> Option<String> {
            tokio::task::yield_now().await;
            Some("clerk-token".to_string())
        }

        fn get_user_id(&self) -> Option<String> {
            Some("user-id".to_string())
        }
    }

    struct EmptyCredentialStore;

    impl CredentialStore for EmptyCredentialStore {
        fn load_refresh_token(&self) -> Option<String> {
            None
        }

        fn save_refresh_token(&self, _token: String) {}

        fn clear_refresh_token(&self) {}
    }

    #[tokio::test]
    async fn clerk_auth_token_awaits_async_provider() {
        let db_path = std::env::temp_dir()
            .join(format!("sverto-auth-provider-{}.db", uuid::Uuid::new_v4()))
            .to_string_lossy()
            .into_owned();
        let infra = SharedInfra::new(
            "https://example.com".to_string(),
            60,
            db_path.clone(),
            Arc::new(AsyncAuthProvider),
            Arc::new(EmptyCredentialStore),
        );
        infra.set_auth_mode(AuthMode::Clerk);

        assert_eq!(infra.get_auth_token().await.as_deref(), Some("clerk-token"));

        drop(infra);
        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn cached_auth_me_hydrates_session_identity() {
        let db_path = std::env::temp_dir()
            .join(format!("sverto-auth-me-{}.db", uuid::Uuid::new_v4()))
            .to_string_lossy()
            .into_owned();
        let infra = SharedInfra::new(
            "https://example.com".to_string(),
            60,
            db_path.clone(),
            Arc::new(AsyncAuthProvider),
            Arc::new(EmptyCredentialStore),
        );
        let auth_me = crate::models::AuthMe {
            user_id: "cached-user".to_string(),
            default_asset: Some(crate::models::DefaultAsset {
                id: 10,
                ticker: "GBP".to_string(),
            }),
            onboarding_version: 1,
            role: "user".to_string(),
            user_metadata: None,
        };

        infra.apply_auth_me(&auth_me);

        assert_eq!(infra.user_id().as_deref(), Some("cached-user"));
        assert_eq!(infra.default_asset_id(), Some(10));
        assert_eq!(infra.default_asset_ticker().as_deref(), Some("GBP"));
        assert_eq!(infra.onboarding_version(), Some(1));

        drop(infra);
        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn test_parse_jwt_exp_valid() {
        let jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature";
        let exp = parse_jwt_exp(jwt);
        assert!(exp.is_some());
    }

    #[test]
    fn test_parse_jwt_exp_invalid_format() {
        assert!(parse_jwt_exp("notajwt").is_none());
        assert!(parse_jwt_exp("a.b").is_none());
    }

    #[test]
    fn test_url_normalisation() {
        assert_eq!(
            normalise_url("  https://example.com/  "),
            "https://example.com"
        );
        assert_eq!(normalise_url("https://example.com"), "https://example.com");
        assert_eq!(normalise_url("https://example.com/"), "https://example.com");
        assert_eq!(
            normalise_url("https://example.com///"),
            "https://example.com"
        );
    }
}

pub fn normalise_url(url: &str) -> String {
    let trimmed = url.trim();
    trimmed.trim_end_matches('/').to_string()
}
