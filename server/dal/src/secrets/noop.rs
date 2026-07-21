use anyhow::Result;
use async_trait::async_trait;

use crate::secrets::{SecretProvider, SecretProviderError};

pub struct NoOpSecretProvider;

#[async_trait]
impl SecretProvider for NoOpSecretProvider {
    async fn store_secret(&self, _key: &str, _value: &[u8]) -> Result<(), SecretProviderError> {
        Err(SecretProviderError::Unavailable(
            "Secret provider is not configured".to_string(),
        ))
    }

    async fn get_secret(&self, _key: &str) -> Result<Option<Vec<u8>>, SecretProviderError> {
        Err(SecretProviderError::Unavailable(
            "Secret provider is not configured".to_string(),
        ))
    }

    async fn delete_secret(&self, _key: &str) -> Result<(), SecretProviderError> {
        Err(SecretProviderError::Unavailable(
            "Secret provider is not configured".to_string(),
        ))
    }
}
