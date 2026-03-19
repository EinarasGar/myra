use anyhow::{anyhow, Result};
#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::file_provider::{FileProvider, FileProviderUnavailableError};
use dal::models::file_models::{FileModel, FileStatus, FileStatusModel};
use dal::queries::file_queries;
use std::sync::Arc;
use time::OffsetDateTime;
use tokio::sync::Semaphore;
use uuid::Uuid;

use crate::dtos::{
    conflict_error_dto::BusinessConflictError,
    file_dto::{CreateFileDto, FileDto, FileUrlDto, FileWithUploadDto},
    not_found_error_dto::BusinessNotFoundError,
    service_unavailable_error_dto::BusinessServiceUnavailableError,
};

const MAX_FILE_SIZE: i64 = 20_971_520;
const MAX_THUMBNAIL_SIZE: u64 = 10_485_760;
const UPLOAD_URL_EXPIRY_SECONDS: u32 = 900;
const DOWNLOAD_URL_EXPIRY_SECONDS: u32 = 3600;
const STALE_PENDING_TIMEOUT_MINUTES: i64 = 10;
const STALE_PROCESSING_TIMEOUT_MINUTES: i64 = 10;
const MIME_DETECTION_BYTES: u64 = 8192;
const MIN_DETECTABLE_FILE_SIZE: u64 = 8;
const MAX_CONCURRENT_THUMBNAILS: usize = 4;

static THUMBNAIL_SEMAPHORE: once_cell::sync::Lazy<Semaphore> =
    once_cell::sync::Lazy::new(|| Semaphore::new(MAX_CONCURRENT_THUMBNAILS));

const TEXT_BASED_MIME_TYPES: &[&str] = &[
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/xhtml+xml",
    "application/sql",
    "application/graphql",
    "application/ld+json",
    "application/x-yaml",
    "application/toml",
];

fn is_text_based_mime(mime: &str) -> bool {
    let base = mime.split(';').next().unwrap_or("").trim();
    TEXT_BASED_MIME_TYPES
        .iter()
        .any(|prefix| base.starts_with(prefix))
}

fn convert_provider_error(err: anyhow::Error) -> anyhow::Error {
    if err.downcast_ref::<FileProviderUnavailableError>().is_some() {
        return BusinessServiceUnavailableError {
            message: err.to_string(),
        }
        .into();
    }
    err
}

pub struct FileService {
    db: MyraDb,
    file_provider: Arc<dyn FileProvider>,
}

impl FileService {
    pub fn new(db: MyraDb, file_provider: Arc<dyn FileProvider>) -> Self {
        Self { db, file_provider }
    }

    pub async fn create_file(
        &self,
        user_id: Uuid,
        dto: CreateFileDto,
    ) -> Result<FileWithUploadDto> {
        let size_bytes = u64::try_from(dto.size_bytes)
            .map_err(|_| anyhow!("size_bytes must be a positive number"))?;

        if size_bytes == 0 || dto.size_bytes > MAX_FILE_SIZE {
            return Err(anyhow!("size_bytes out of valid range"));
        }

        let file_id = Uuid::new_v4();
        let storage_key = format!("uploads/{}/{}", user_id, file_id);

        let query = file_queries::insert_file(
            file_id,
            user_id,
            dto.original_name.clone(),
            dto.mime_type.clone(),
            dto.size_bytes,
            storage_key.clone(),
        );
        let file: FileModel = self.db.fetch_one(query).await?;

        let presigned = match self
            .file_provider
            .generate_presigned_upload(
                &storage_key,
                &dto.mime_type,
                size_bytes,
                UPLOAD_URL_EXPIRY_SECONDS,
            )
            .await
        {
            Ok(p) => p,
            Err(e) => {
                let delete_query = file_queries::delete_file(file_id, user_id);
                if let Err(db_err) = self.db.execute(delete_query).await {
                    tracing::error!(file_id = %file_id, error = %db_err, "Failed to delete DB record after presign failure");
                }
                return Err(convert_provider_error(e));
            }
        };

        let file_dto: FileDto = file.into();
        Ok(FileWithUploadDto {
            file: file_dto,
            upload_url: presigned.upload_url,
            upload_method: presigned.upload_method,
            upload_headers: presigned.upload_headers,
            upload_expires_in_seconds: presigned.upload_expires_in_seconds,
        })
    }

    pub async fn get_file(&self, user_id: Uuid, file_id: Uuid) -> Result<FileDto> {
        let query = file_queries::get_file_by_id_and_user(file_id, user_id);
        let file: Option<FileModel> = self.db.fetch_optional(query).await?;
        let file = file.ok_or_else(|| BusinessNotFoundError {
            message: "File not found".to_string(),
        })?;

        let now = OffsetDateTime::now_utc();
        let status = file.file_status();
        let updated_elapsed = (now - file.updated_at).whole_minutes();

        if status == FileStatus::Pending && updated_elapsed > STALE_PENDING_TIMEOUT_MINUTES {
            if let Err(e) = self.file_provider.delete(&file.storage_key).await {
                tracing::warn!(file_id = %file_id, error = %e, "Failed to delete stale pending file from storage");
            }
            let delete_query = file_queries::delete_file(file_id, user_id);
            self.db.execute(delete_query).await?;
            return Err(BusinessNotFoundError {
                message: "File not found".to_string(),
            }
            .into());
        }

        if status == FileStatus::Processing && updated_elapsed > STALE_PROCESSING_TIMEOUT_MINUTES {
            let update_query =
                file_queries::update_file_status(file_id, user_id, FileStatus::Failed);
            let updated: Option<FileModel> = self.db.fetch_optional(update_query).await?;
            return match updated {
                Some(row) => Ok(row.into()),
                None => Err(BusinessNotFoundError {
                    message: "File not found".to_string(),
                }
                .into()),
            };
        }

        Ok(file.into())
    }

    pub async fn confirm_file(&self, user_id: Uuid, file_id: Uuid) -> Result<FileDto> {
        let query = file_queries::update_file_status_conditional(
            file_id,
            user_id,
            FileStatus::Pending,
            FileStatus::Processing,
        );
        let file: Option<FileModel> = self.db.fetch_optional(query).await?;

        let file = match file {
            Some(f) => f,
            None => {
                let check_query = file_queries::get_file_status_by_id_and_user(file_id, user_id);
                let status: Option<FileStatusModel> = self.db.fetch_optional(check_query).await?;
                return match status {
                    Some(_) => Err(BusinessConflictError {
                        message: "File status must be pending to confirm upload.".to_string(),
                    }
                    .into()),
                    None => Err(BusinessNotFoundError {
                        message: "File not found".to_string(),
                    }
                    .into()),
                };
            }
        };

        let file_provider = self.file_provider.clone();
        let db = self.db.clone();
        let storage_key = file.storage_key.clone();
        let declared_mime = file.mime_type.clone();
        let declared_size = file.size_bytes;
        let file_uuid = file.id;
        let file_user_id = file.user_id;

        tokio::spawn(async move {
            let result = process_file_background(
                &file_provider,
                &db,
                file_uuid,
                file_user_id,
                &storage_key,
                &declared_mime,
                declared_size,
            )
            .await;

            if let Err(e) = result {
                tracing::error!(file_id = %file_uuid, error = %e, "Background file processing failed");
                let fail_query =
                    file_queries::update_file_status(file_uuid, file_user_id, FileStatus::Failed);
                if let Err(db_err) = db.execute(fail_query).await {
                    tracing::error!(file_id = %file_uuid, error = %db_err, "Failed to update file status to failed");
                }
            }
        });

        Ok(file.into())
    }

    pub async fn get_download_url(&self, user_id: Uuid, file_id: Uuid) -> Result<FileUrlDto> {
        let query = file_queries::get_file_by_id_and_user(file_id, user_id);
        let file: Option<FileModel> = self.db.fetch_optional(query).await?;
        let file = file.ok_or_else(|| BusinessNotFoundError {
            message: "File not found".to_string(),
        })?;

        if file.file_status() != FileStatus::Ready {
            return Err(BusinessConflictError {
                message: "File is not yet available for download.".to_string(),
            }
            .into());
        }

        let url = self
            .file_provider
            .generate_presigned_download(&file.storage_key, DOWNLOAD_URL_EXPIRY_SECONDS)
            .await
            .map_err(convert_provider_error)?;

        Ok(FileUrlDto {
            url,
            expires_in_seconds: DOWNLOAD_URL_EXPIRY_SECONDS,
        })
    }

    pub async fn get_thumbnail_url(&self, user_id: Uuid, file_id: Uuid) -> Result<FileUrlDto> {
        let query = file_queries::get_file_by_id_and_user(file_id, user_id);
        let file: Option<FileModel> = self.db.fetch_optional(query).await?;
        let file = file.ok_or_else(|| BusinessNotFoundError {
            message: "File not found".to_string(),
        })?;

        if file.file_status() != FileStatus::Ready {
            return Err(BusinessConflictError {
                message: "File is not yet available for download.".to_string(),
            }
            .into());
        }

        let thumbnail_key = file.thumbnail_key.ok_or_else(|| BusinessNotFoundError {
            message: "Thumbnail not available for this file".to_string(),
        })?;

        let url = self
            .file_provider
            .generate_presigned_download(&thumbnail_key, DOWNLOAD_URL_EXPIRY_SECONDS)
            .await
            .map_err(convert_provider_error)?;

        Ok(FileUrlDto {
            url,
            expires_in_seconds: DOWNLOAD_URL_EXPIRY_SECONDS,
        })
    }

    pub async fn delete_file(&self, user_id: Uuid, file_id: Uuid) -> Result<()> {
        let query = file_queries::get_file_by_id_and_user(file_id, user_id);
        let file: Option<FileModel> = self.db.fetch_optional(query).await?;
        let file = file.ok_or_else(|| BusinessNotFoundError {
            message: "File not found".to_string(),
        })?;

        self.file_provider
            .delete(&file.storage_key)
            .await
            .map_err(convert_provider_error)?;

        if let Some(ref thumb_key) = file.thumbnail_key {
            if let Err(e) = self.file_provider.delete(thumb_key).await {
                tracing::warn!(file_id = %file_id, error = %e, "Failed to delete thumbnail from storage");
            }
        }

        let delete_query = file_queries::delete_file(file_id, user_id);
        self.db.execute(delete_query).await?;

        Ok(())
    }
}

async fn process_file_background(
    file_provider: &Arc<dyn FileProvider>,
    db: &MyraDb,
    file_id: Uuid,
    user_id: Uuid,
    storage_key: &str,
    declared_mime: &str,
    declared_size: i64,
) -> Result<()> {
    let expected_size =
        u64::try_from(declared_size).map_err(|_| anyhow!("Invalid stored file size"))?;

    if expected_size < MIN_DETECTABLE_FILE_SIZE {
        return Err(anyhow!(
            "File too small for MIME detection ({} bytes, minimum {} required)",
            expected_size,
            MIN_DETECTABLE_FILE_SIZE
        ));
    }

    let declared_base_mime = declared_mime.split(';').next().unwrap_or("").trim();

    let header_bytes = file_provider
        .download_range(
            storage_key,
            0,
            MIME_DETECTION_BYTES.min(expected_size).saturating_sub(1),
        )
        .await?;

    match infer::get(&header_bytes) {
        Some(kind) => {
            if kind.mime_type() != declared_base_mime {
                return Err(anyhow!(
                    "MIME type mismatch: declared {} but detected {}",
                    declared_base_mime,
                    kind.mime_type()
                ));
            }
        }
        None => {
            if !is_text_based_mime(declared_mime) {
                return Err(anyhow!(
                    "Could not determine file type; upload rejected. Declared MIME: {}",
                    declared_mime
                ));
            }
        }
    }

    let actual_size = file_provider.head_object(storage_key).await?;
    if actual_size != expected_size {
        return Err(anyhow!(
            "Size mismatch: declared {} but actual {}",
            declared_size,
            actual_size
        ));
    }

    let thumbnail_key =
        if declared_base_mime.starts_with("image/") && expected_size <= MAX_THUMBNAIL_SIZE {
            let _permit = THUMBNAIL_SEMAPHORE
                .acquire()
                .await
                .map_err(|_| anyhow!("Thumbnail semaphore closed"))?;
            let bytes = file_provider.download(storage_key).await?;
            match generate_thumbnail(&bytes) {
                Ok(thumb_bytes) => {
                    let thumb_key = format!("thumbnails/{}.webp", file_id);
                    file_provider
                        .upload(&thumb_key, &thumb_bytes, "image/webp")
                        .await?;
                    Some(thumb_key)
                }
                Err(e) => {
                    tracing::warn!(file_id = %file_id, error = %e, "Failed to generate thumbnail");
                    None
                }
            }
        } else {
            None
        };

    let update_query = file_queries::update_file_ready(file_id, user_id, thumbnail_key.clone());
    let rows = db.execute_with_rows_affected(update_query).await?;

    if rows == 0 {
        if let Some(ref thumb_key) = thumbnail_key {
            if let Err(e) = file_provider.delete(thumb_key).await {
                tracing::warn!(file_id = %file_id, error = %e, "Failed to clean up orphaned thumbnail after no-op update_file_ready");
            }
        }
        tracing::warn!(file_id = %file_id, "update_file_ready affected 0 rows — file may have been deleted or status changed concurrently");
    }

    Ok(())
}

fn generate_thumbnail(bytes: &[u8]) -> Result<Vec<u8>> {
    use image::ImageReader;
    use std::io::Cursor;

    let img = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()?
        .decode()?;

    let thumbnail = img.thumbnail(256, 256);

    let mut output = Vec::new();
    thumbnail.write_to(&mut Cursor::new(&mut output), image::ImageFormat::WebP)?;

    Ok(output)
}
