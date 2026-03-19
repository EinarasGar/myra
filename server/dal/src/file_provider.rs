use anyhow::Result;
use async_trait::async_trait;
use std::collections::HashMap;

#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct FileProviderUnavailableError {
    pub message: String,
}

pub struct PresignedUpload {
    pub upload_url: String,
    pub upload_method: String,
    pub upload_headers: HashMap<String, String>,
    pub upload_expires_in_seconds: u32,
}

#[async_trait]
pub trait FileProvider: Send + Sync {
    async fn generate_presigned_upload(
        &self,
        key: &str,
        content_type: &str,
        content_length: u64,
        expires_in_seconds: u32,
    ) -> Result<PresignedUpload>;

    async fn generate_presigned_download(
        &self,
        key: &str,
        expires_in_seconds: u32,
    ) -> Result<String>;

    async fn download(&self, key: &str) -> Result<Vec<u8>>;

    async fn download_range(&self, key: &str, start: u64, end: u64) -> Result<Vec<u8>>;

    async fn head_object(&self, key: &str) -> Result<u64>;

    async fn upload(&self, key: &str, content: &[u8], content_type: &str) -> Result<()>;

    async fn delete(&self, key: &str) -> Result<()>;
}
