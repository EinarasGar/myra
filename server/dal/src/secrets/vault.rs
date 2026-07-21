use async_trait::async_trait;
use base64::Engine;
use observability::{create_http_client, TracedHttpClient};
use serde::{Deserialize, Serialize};

use crate::secrets::{SecretProvider, SecretProviderError};

const MOUNT_PATH: &str = "secret";

pub struct VaultSecretProvider {
    http: TracedHttpClient,
    addr: String,
    token: String,
}

#[derive(Serialize)]
struct KvWriteRequest {
    data: KvData,
}

#[derive(Serialize)]
struct KvData {
    value: String,
}

#[derive(Deserialize)]
struct KvReadResponse {
    data: KvReadData,
}

#[derive(Deserialize)]
struct KvReadData {
    data: serde_json::Value,
}

impl VaultSecretProvider {
    pub fn new() -> anyhow::Result<Self> {
        let addr =
            std::env::var("VAULT_ADDR").map_err(|_| anyhow::anyhow!("VAULT_ADDR not set"))?;
        let token =
            std::env::var("VAULT_TOKEN").map_err(|_| anyhow::anyhow!("VAULT_TOKEN not set"))?;

        Ok(Self {
            http: create_http_client(),
            addr,
            token,
        })
    }
}

#[async_trait]
impl SecretProvider for VaultSecretProvider {
    async fn store_secret(&self, key: &str, value: &[u8]) -> Result<(), SecretProviderError> {
        let url = format!("{}/v1/{}/data/{}", self.addr, MOUNT_PATH, key);
        let body = KvWriteRequest {
            data: KvData {
                value: base64::engine::general_purpose::STANDARD.encode(value),
            },
        };

        let resp = self
            .http
            .post(&url)
            .header("X-Vault-Token", &self.token)
            .json(&body)
            .send()
            .await
            .map_err(|e| SecretProviderError::Other(e.into()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(SecretProviderError::Unavailable(format!(
                "vault store failed {status}: {text}"
            )));
        }

        Ok(())
    }

    async fn get_secret(&self, key: &str) -> Result<Option<Vec<u8>>, SecretProviderError> {
        let url = format!("{}/v1/{}/data/{}", self.addr, MOUNT_PATH, key);

        let resp = self
            .http
            .get(&url)
            .header("X-Vault-Token", &self.token)
            .send()
            .await
            .map_err(|e| SecretProviderError::Other(e.into()))?;

        if resp.status().as_u16() == 404 {
            return Ok(None);
        }

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(SecretProviderError::Unavailable(format!(
                "vault get failed {status}: {text}"
            )));
        }

        let parsed: KvReadResponse = resp
            .json()
            .await
            .map_err(|e| SecretProviderError::Other(e.into()))?;
        let value_str = parsed
            .data
            .data
            .get("value")
            .and_then(|v| v.as_str())
            .ok_or_else(|| {
                SecretProviderError::Other(anyhow::anyhow!("vault response missing value field"))
            })?;

        let bytes = base64::engine::general_purpose::STANDARD
            .decode(value_str)
            .map_err(|e| SecretProviderError::Other(e.into()))?;

        Ok(Some(bytes))
    }

    async fn delete_secret(&self, key: &str) -> Result<(), SecretProviderError> {
        let url = format!("{}/v1/{}/data/{}", self.addr, MOUNT_PATH, key);

        let resp = self
            .http
            .delete(&url)
            .header("X-Vault-Token", &self.token)
            .send()
            .await
            .map_err(|e| SecretProviderError::Other(e.into()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(SecretProviderError::Unavailable(format!(
                "vault delete failed {status}: {text}"
            )));
        }

        Ok(())
    }
}
