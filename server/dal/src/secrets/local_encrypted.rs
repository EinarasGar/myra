use aes_gcm::{AeadCore, AeadInPlace, Aes256Gcm, KeyInit, Nonce};
use anyhow::Result;
use async_trait::async_trait;
use sqlx::PgPool;

use crate::secrets::{SecretProvider, SecretProviderError};

const ENC_KEY_ENV: &str = "CONNECTOR_ENC_KEY";

pub struct LocalEncryptedSecretProvider {
    pool: PgPool,
    cipher: Aes256Gcm,
}

impl LocalEncryptedSecretProvider {
    pub fn new(pool: PgPool) -> Result<Self> {
        let key_hex = std::env::var(ENC_KEY_ENV)
            .map_err(|e| SecretProviderError::Unavailable(format!("{e}")))?;

        let key_bytes = hex::decode(&key_hex).map_err(|e| {
            SecretProviderError::Unavailable(format!("Invalid hex in CONNECTOR_ENC_KEY: {e}"))
        })?;

        if key_bytes.len() != 32 {
            return Err(anyhow::anyhow!(
                "Encryption key must be 32 bytes (64 hex chars), got {} bytes",
                key_bytes.len()
            ));
        }

        let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|_| {
            SecretProviderError::Unavailable("Failed to derive AES-256 key".to_string())
        })?;

        Ok(Self { pool, cipher })
    }

    fn encrypt(&self, plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
        let nonce = Aes256Gcm::generate_nonce(&mut rand::thread_rng());
        let mut buffer = plaintext.to_vec();
        self.cipher
            .encrypt_in_place(&nonce, &[], &mut buffer)
            .map_err(|e| anyhow::anyhow!("encryption failed: {e}"))?;
        Ok((nonce.to_vec(), buffer))
    }

    fn decrypt(&self, nonce: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>> {
        #[allow(deprecated)]
        let nonce = Nonce::from_slice(nonce);
        let mut buffer = ciphertext.to_vec();
        self.cipher
            .decrypt_in_place(nonce, &[], &mut buffer)
            .map_err(|_| anyhow::anyhow!("decryption failed"))?;
        Ok(buffer)
    }
}

#[async_trait]
impl SecretProvider for LocalEncryptedSecretProvider {
    async fn store_secret(&self, key: &str, value: &[u8]) -> Result<(), SecretProviderError> {
        let (nonce, ciphertext) = self.encrypt(value).map_err(SecretProviderError::Other)?;

        sqlx::query(
            "INSERT INTO secrets (key, ciphertext, nonce) \
             VALUES ($1, $2, $3) \
             ON CONFLICT (key) \
             DO UPDATE SET ciphertext = $2, nonce = $3",
        )
        .bind(key)
        .bind(ciphertext)
        .bind(nonce)
        .execute(&self.pool)
        .await
        .map_err(|e| SecretProviderError::Other(e.into()))?;

        Ok(())
    }

    async fn get_secret(&self, key: &str) -> Result<Option<Vec<u8>>, SecretProviderError> {
        let row = sqlx::query_as::<_, (Vec<u8>, Vec<u8>)>(
            "SELECT ciphertext, nonce FROM secrets WHERE key = $1",
        )
        .bind(key)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| SecretProviderError::Other(e.into()))?;

        match row {
            Some((ciphertext, nonce)) => {
                let plaintext = self
                    .decrypt(&nonce, &ciphertext)
                    .map_err(SecretProviderError::Other)?;
                Ok(Some(plaintext))
            }
            None => Ok(None),
        }
    }

    async fn delete_secret(&self, key: &str) -> Result<(), SecretProviderError> {
        sqlx::query("DELETE FROM secrets WHERE key = $1")
            .bind(key)
            .execute(&self.pool)
            .await
            .map_err(|e| SecretProviderError::Other(e.into()))?;

        Ok(())
    }
}
