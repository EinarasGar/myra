use anyhow::Result;
use async_trait::async_trait;

use crate::file_provider::{FileProvider, FileProviderUnavailableError, PresignedUpload};

fn unavailable() -> anyhow::Error {
    FileProviderUnavailableError {
        message:
            "File storage is not configured. Set S3_* environment variables to enable file uploads."
                .to_string(),
    }
    .into()
}

pub struct NoOpFileProvider;

#[async_trait]
impl FileProvider for NoOpFileProvider {
    async fn generate_presigned_upload(
        &self,
        _key: &str,
        _content_type: &str,
        _content_length: u64,
        _expires_in_seconds: u32,
    ) -> Result<PresignedUpload> {
        Err(unavailable())
    }

    async fn generate_presigned_download(
        &self,
        _key: &str,
        _expires_in_seconds: u32,
    ) -> Result<String> {
        Err(unavailable())
    }

    async fn download(&self, _key: &str) -> Result<Vec<u8>> {
        Err(unavailable())
    }

    async fn download_range(&self, _key: &str, _start: u64, _end: u64) -> Result<Vec<u8>> {
        Err(unavailable())
    }

    async fn head_object(&self, _key: &str) -> Result<u64> {
        Err(unavailable())
    }

    async fn upload(&self, _key: &str, _content: &[u8], _content_type: &str) -> Result<()> {
        Err(unavailable())
    }

    async fn delete(&self, _key: &str) -> Result<()> {
        Err(unavailable())
    }
}
