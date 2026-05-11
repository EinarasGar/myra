use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use crate::api::cache::PersistentCache;
use crate::error::ApiError;
use crate::models::ApiResponse;

pub type OnOfflineChangedCallback = Arc<dyn Fn() + Send + Sync>;

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

pub struct SharedInfra {
    pub base_url: String,
    pub http: reqwest::Client,
    cache: Mutex<HashMap<String, CacheEntry>>,
    cache_ttl: Duration,
    pub persistent_cache: PersistentCache,
    pub connectivity: AtomicBool,
    pub is_offline: AtomicBool,
    pub user_id: Mutex<Option<String>>,
    pub db_path: String,
    on_offline_changed: Mutex<Option<OnOfflineChangedCallback>>,
}

impl SharedInfra {
    pub fn new(base_url: String, cache_ttl_secs: u64, db_path: String) -> Self {
        let http = reqwest::Client::builder()
            .use_preconfigured_tls(tls_config().clone())
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");

        let persistent_cache = PersistentCache::open(&db_path);

        Self {
            base_url,
            http,
            cache: Mutex::new(HashMap::new()),
            cache_ttl: Duration::from_secs(cache_ttl_secs),
            persistent_cache,
            connectivity: AtomicBool::new(true),
            is_offline: AtomicBool::new(false),
            user_id: Mutex::new(None),
            db_path,
            on_offline_changed: Mutex::new(None),
        }
    }

    pub fn set_on_offline_changed(&self, callback: OnOfflineChangedCallback) {
        *self.on_offline_changed.lock().unwrap() = Some(callback);
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
        let url = format!("{}{}", self.base_url, url_suffix);
        self.cache.lock().unwrap().remove(&url);
    }

    pub fn evict_memory_cache_prefix(&self, url_prefix: &str) {
        let prefix = format!("{}{}", self.base_url, url_prefix);
        self.cache.lock().unwrap().retain(|k, _| !k.starts_with(&prefix));
    }

    pub async fn get(
        &self,
        path: &str,
        auth_token: Option<&str>,
    ) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url, path);

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
            self.do_request(reqwest::Method::GET, &url, None, auth_token, Some(Duration::from_secs(5)))
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
        let url = format!("{}{}", self.base_url, path);
        self.do_request(reqwest::Method::POST, &url, Some(body), auth_token, None)
            .await
    }

    pub async fn put(
        &self,
        path: &str,
        body: &str,
        auth_token: Option<&str>,
    ) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url, path);
        self.do_request(reqwest::Method::PUT, &url, Some(body), auth_token, None)
            .await
    }

    pub async fn delete(
        &self,
        path: &str,
        auth_token: Option<&str>,
    ) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url, path);
        self.do_request(reqwest::Method::DELETE, &url, None, auth_token, None)
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
