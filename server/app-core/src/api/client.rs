use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use crate::api::holdings::extract_holdings;
use crate::api::transactions::extract_page;
use crate::error::ApiError;
use crate::models::{ApiResponse, AuthMe, HoldingItem, TransactionsPage};
use shared::view_models::portfolio::get_networth_history::GetNetWorthHistoryResponseViewModel;

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

#[derive(uniffi::Object)]
pub struct ApiClient {
    base_url: String,
    auth_token: Mutex<Option<String>>,
    http: reqwest::Client,
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
    cache_ttl: Duration,
}

const MAX_RETRIES: u32 = 3;
const INITIAL_BACKOFF_MS: u64 = 200;

#[uniffi::export(async_runtime = "tokio")]
impl ApiClient {
    #[uniffi::constructor]
    pub fn new(base_url: String, cache_ttl_secs: u64) -> Self {
        let http = reqwest::Client::builder()
            .use_preconfigured_tls(tls_config().clone())
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");

        Self {
            base_url,
            auth_token: Mutex::new(None),
            http,
            cache: Arc::new(Mutex::new(HashMap::new())),
            cache_ttl: Duration::from_secs(cache_ttl_secs),
        }
    }

    pub fn set_auth_token(&self, token: String) {
        *self.auth_token.lock().unwrap() = Some(token);
    }

    pub fn clear_auth_token(&self) {
        *self.auth_token.lock().unwrap() = None;
    }

    pub async fn get(&self, path: String) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url, path);

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

        let response = self
            .request_with_retry(reqwest::Method::GET, &url, None)
            .await?;

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

    pub async fn post(&self, path: String, body: String) -> Result<ApiResponse, ApiError> {
        let url = format!("{}{}", self.base_url, path);
        self.request_with_retry(reqwest::Method::POST, &url, Some(body))
            .await
    }

    pub async fn get_portfolio_history(
        &self,
        user_id: String,
        range: String,
    ) -> Result<GetNetWorthHistoryResponseViewModel, ApiError> {
        self.get_json(format!(
            "/api/users/{user_id}/portfolio/history?range={range}"
        ))
        .await
    }

    pub async fn get_me(&self) -> Result<AuthMe, ApiError> {
        self.get_json("/api/auth/me".to_string()).await
    }

    pub async fn get_transactions(
        &self,
        user_id: String,
        limit: u32,
        cursor: Option<String>,
    ) -> Result<TransactionsPage, ApiError> {
        let mut path = format!("/api/users/{user_id}/transactions?limit={limit}");
        if let Some(ref c) = cursor {
            path.push_str(&format!("&cursor={c}"));
        }

        let resp = self.get(path).await?;
        extract_page(&resp.body).map_err(|e| ApiError::Parse { reason: e })
    }

    pub async fn get_holdings(&self, user_id: String) -> Result<Vec<HoldingItem>, ApiError> {
        let resp = self
            .get(format!("/api/users/{user_id}/portfolio/holdings"))
            .await?;
        extract_holdings(&resp.body).map_err(|e| ApiError::Parse { reason: e })
    }

    pub fn clear_cache(&self) {
        self.cache.lock().unwrap().clear();
    }
}

impl ApiClient {
    async fn get_json<T: serde::de::DeserializeOwned>(&self, path: String) -> Result<T, ApiError> {
        let resp = self.get(path).await?;
        serde_json::from_str(&resp.body).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })
    }

    async fn request_with_retry(
        &self,
        method: reqwest::Method,
        url: &str,
        body: Option<String>,
    ) -> Result<ApiResponse, ApiError> {
        let mut last_error: Option<ApiError> = None;

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let backoff = Duration::from_millis(INITIAL_BACKOFF_MS * 2u64.pow(attempt - 1));
                tokio::time::sleep(backoff).await;
            }

            let mut req = self.http.request(method.clone(), url);

            if let Some(ref token) = *self.auth_token.lock().unwrap() {
                req = req.bearer_auth(token);
            }

            if let Some(ref b) = body {
                req = req
                    .header("Content-Type", "application/json")
                    .body(b.clone());
            }

            match req.send().await {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    if status >= 500 {
                        last_error = Some(ApiError::Server {
                            reason: format!("HTTP {status}"),
                            status,
                        });
                        continue;
                    }
                    let text = resp.text().await.map_err(|e| ApiError::Parse {
                        reason: e.to_string(),
                    })?;
                    return Ok(ApiResponse { status, body: text });
                }
                Err(e) => {
                    last_error = Some(e.into());
                }
            }
        }

        Err(last_error.unwrap_or(ApiError::Network {
            reason: "unknown error after retries".into(),
        }))
    }
}
