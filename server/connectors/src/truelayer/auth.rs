use crate::port::ConnectorStore;
use crate::truelayer::config::TrueLayerConfig;
use crate::Result;
use observability::create_http_client;
use std::time::Duration;

const ACCESS_TOKEN_TTL_SECS: u64 = 55 * 60;
const ACCESS_TOKEN_CACHE_KEY: &str = "truelayer:access_token";

// Single-flight refresh: TrueLayer refresh tokens are single-use, so concurrent syncs on one
// connection must not each refresh (that rotates the token N times and trips the provider's
// reuse detection — 401s, and can revoke the whole grant). Only the lock holder refreshes.
const REFRESH_LOCK_KEY: &str = "truelayer:refresh_lock";
const REFRESH_LOCK_TTL_SECS: u64 = 15;
const REFRESH_LOCK_WAIT_ATTEMPTS: u32 = 40;
const REFRESH_LOCK_POLL: Duration = Duration::from_millis(250);

pub async fn access_token(store: &dyn ConnectorStore) -> Result<String> {
    if let Some(cached) = store.cache_get(ACCESS_TOKEN_CACHE_KEY).await {
        return Ok(cached);
    }

    for _ in 0..REFRESH_LOCK_WAIT_ATTEMPTS {
        if store
            .cache_lock(REFRESH_LOCK_KEY, REFRESH_LOCK_TTL_SECS)
            .await
        {
            // Re-check the cache under the lock — a prior holder may have just filled it.
            let result = match store.cache_get(ACCESS_TOKEN_CACHE_KEY).await {
                Some(cached) => Ok(cached),
                None => refresh_and_cache(store).await,
            };
            store.cache_unlock(REFRESH_LOCK_KEY).await;
            return result;
        }

        // Another caller holds the lock — wait briefly, then see if it filled the cache.
        tokio::time::sleep(REFRESH_LOCK_POLL).await;
        if let Some(cached) = store.cache_get(ACCESS_TOKEN_CACHE_KEY).await {
            return Ok(cached);
        }
    }

    // Lock holder is slow or crashed and the lock hasn't expired yet — refresh directly rather
    // than fail. Bounded by the 15s lock TTL, so this is rare.
    refresh_and_cache(store).await
}

async fn refresh_and_cache(store: &dyn ConnectorStore) -> Result<String> {
    let refresh = store
        .get_credential()
        .await?
        .ok_or_else(|| anyhow::anyhow!("TrueLayer credential not found"))?;
    let refresh = String::from_utf8(refresh)?;

    let token_response = refresh_token(&refresh).await?;

    store
        .put_credential(token_response.refresh_token.as_bytes())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to store refreshed token: {e}"))?;

    store
        .cache_put(
            ACCESS_TOKEN_CACHE_KEY,
            &token_response.access_token,
            ACCESS_TOKEN_TTL_SECS,
        )
        .await;

    Ok(token_response.access_token)
}

pub fn auth_base() -> &'static str {
    if TrueLayerConfig::get().sandbox {
        "https://auth.truelayer-sandbox.com"
    } else {
        "https://auth.truelayer.com"
    }
}

pub fn api_base() -> &'static str {
    if TrueLayerConfig::get().sandbox {
        "https://api.truelayer-sandbox.com"
    } else {
        "https://api.truelayer.com"
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
}

pub fn build_auth_link(state: &str) -> String {
    let config = TrueLayerConfig::get();
    let client_id = config.client_id.as_deref().unwrap_or("");
    let redirect_uri = config.redirect_uri.as_deref().unwrap_or("");
    let providers = if config.sandbox {
        "&providers=uk-cs-mock"
    } else {
        ""
    };
    format!(
        "{}/?response_type=code&client_id={}&redirect_uri={}&scope=info%20accounts%20balance%20cards%20transactions%20offline_access&state={}{}",
        auth_base(),
        client_id,
        urlencoding_encode(redirect_uri),
        state,
        providers
    )
}

fn urlencoding_encode(value: &str) -> String {
    serde_urlencoded::to_string([("v", value)])
        .map(|s| s.trim_start_matches("v=").to_string())
        .unwrap_or_else(|_| value.to_string())
}

async fn post_token(params: &[(&str, &str)]) -> Result<TokenResponse> {
    let form_body = serde_urlencoded::to_string(params)?;
    let resp = create_http_client()
        .post(format!("{}/connect/token", auth_base()))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(form_body)
        .send()
        .await?;
    let resp = crate::util::ensure_success(resp).await?;
    Ok(resp.json().await?)
}

pub async fn exchange_code(code: &str) -> Result<TokenResponse> {
    let config = TrueLayerConfig::get();
    let client_id = config
        .client_id
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("TrueLayer not configured"))?;
    let client_secret = config
        .client_secret
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("TrueLayer not configured"))?;
    let redirect_uri = config
        .redirect_uri
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("TrueLayer not configured"))?;

    post_token(&[
        ("grant_type", "authorization_code"),
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("code", code),
    ])
    .await
}

pub async fn refresh_token(refresh_token: &str) -> Result<TokenResponse> {
    let config = TrueLayerConfig::get();
    let client_id = config
        .client_id
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("TrueLayer not configured"))?;
    let client_secret = config
        .client_secret
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("TrueLayer not configured"))?;

    post_token(&[
        ("grant_type", "refresh_token"),
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("refresh_token", refresh_token),
    ])
    .await
}
