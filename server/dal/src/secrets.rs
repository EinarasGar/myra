use anyhow::Result;
use async_trait::async_trait;

#[derive(Debug, thiserror::Error)]
pub enum SecretProviderError {
    #[error("secret provider unavailable: {0}")]
    Unavailable(String),
    #[error("secret not found: {0}")]
    NotFound(String),
    #[error("secret provider error: {0}")]
    Other(#[from] anyhow::Error),
}

#[async_trait]
pub trait SecretProvider: Send + Sync {
    async fn store_secret(&self, key: &str, value: &[u8]) -> Result<(), SecretProviderError>;
    async fn get_secret(&self, key: &str) -> Result<Option<Vec<u8>>, SecretProviderError>;
    async fn delete_secret(&self, key: &str) -> Result<(), SecretProviderError>;
}

pub mod local_encrypted;
pub mod noop;
pub mod vault;

pub use local_encrypted::LocalEncryptedSecretProvider;
pub use noop::NoOpSecretProvider;
pub use vault::VaultSecretProvider;
