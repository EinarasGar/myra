use anyhow::{anyhow, Result};
use async_trait::async_trait;
use http::HeaderMap;
use s3::creds::Credentials;
use s3::{Bucket, Region};
use std::collections::HashMap;

use crate::file_provider::{FileProvider, PresignedUpload};

pub struct S3FileProvider {
    bucket: Box<Bucket>,
}

impl S3FileProvider {
    pub fn new() -> Result<Self> {
        let bucket_name =
            std::env::var("S3_BUCKET_NAME").map_err(|_| anyhow!("S3_BUCKET_NAME must be set"))?;
        let access_key =
            std::env::var("S3_ACCESS_KEY").map_err(|_| anyhow!("S3_ACCESS_KEY must be set"))?;
        let secret_key =
            std::env::var("S3_SECRET_KEY").map_err(|_| anyhow!("S3_SECRET_KEY must be set"))?;
        let region_name =
            std::env::var("S3_REGION").map_err(|_| anyhow!("S3_REGION must be set"))?;
        let endpoint =
            std::env::var("S3_ENDPOINT").map_err(|_| anyhow!("S3_ENDPOINT must be set"))?;

        let region = Region::Custom {
            region: region_name,
            endpoint,
        };

        let credentials = Credentials::new(Some(&access_key), Some(&secret_key), None, None, None)
            .map_err(|e| anyhow!("Failed to create S3 credentials: {}", e))?;

        let bucket = Bucket::new(&bucket_name, region, credentials)
            .map_err(|e| anyhow!("Failed to create S3 bucket: {}", e))?
            .with_path_style();

        Ok(Self { bucket })
    }
}

#[async_trait]
impl FileProvider for S3FileProvider {
    async fn generate_presigned_upload(
        &self,
        key: &str,
        content_type: &str,
        content_length: u64,
        expires_in_seconds: u32,
    ) -> Result<PresignedUpload> {
        let mut custom_headers = HeaderMap::new();
        custom_headers.insert(
            "Content-Length",
            content_length
                .to_string()
                .parse()
                .map_err(|e| anyhow!("Invalid Content-Length header value: {}", e))?,
        );

        let url = self
            .bucket
            .presign_put(key, expires_in_seconds, Some(custom_headers), None)
            .await
            .map_err(|e| anyhow!("Failed to generate presigned upload URL: {}", e))?;

        // Content-Length is signed into the presigned URL and enforced by S3/MinIO — the
        // client must send exactly this many bytes or the upload is rejected.
        // Content-Type is advisory only and not enforced. Actual MIME verification
        // happens in background processing via `infer::get`.
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), content_type.to_string());
        headers.insert("Content-Length".to_string(), content_length.to_string());

        Ok(PresignedUpload {
            upload_url: url,
            upload_method: "PUT".to_string(),
            upload_headers: headers,
            upload_expires_in_seconds: expires_in_seconds,
        })
    }

    async fn generate_presigned_download(
        &self,
        key: &str,
        expires_in_seconds: u32,
    ) -> Result<String> {
        self.bucket
            .presign_get(key, expires_in_seconds, None)
            .await
            .map_err(|e| anyhow!("Failed to generate presigned download URL: {}", e))
    }

    async fn download(&self, key: &str) -> Result<Vec<u8>> {
        let response = self
            .bucket
            .get_object(key)
            .await
            .map_err(|e| anyhow!("Failed to download object: {}", e))?;
        Ok(response.bytes().to_vec())
    }

    async fn download_range(&self, key: &str, start: u64, end: u64) -> Result<Vec<u8>> {
        let response = self
            .bucket
            .get_object_range(key, start, Some(end))
            .await
            .map_err(|e| anyhow!("Failed to download object range: {}", e))?;
        Ok(response.bytes().to_vec())
    }

    async fn head_object(&self, key: &str) -> Result<u64> {
        let (head, _status) = self
            .bucket
            .head_object(key)
            .await
            .map_err(|e| anyhow!("Failed to head object: {}", e))?;
        let size = head
            .content_length
            .ok_or_else(|| anyhow!("Head response missing Content-Length"))?;
        u64::try_from(size).map_err(|_| anyhow!("Invalid Content-Length from head response"))
    }

    async fn upload(&self, key: &str, content: &[u8], content_type: &str) -> Result<()> {
        self.bucket
            .put_object_with_content_type(key, content, content_type)
            .await
            .map_err(|e| anyhow!("Failed to upload object: {}", e))?;
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<()> {
        self.bucket
            .delete_object(key)
            .await
            .map_err(|e| anyhow!("Failed to delete object: {}", e))?;
        Ok(())
    }
}
