use anyhow::{anyhow, Result};
#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::file_provider::{FileProvider, FileProviderUnavailableError};
use dal::job_queue::JobQueueHandle;
use dal::models::file_models::{FileModel, FileStatus, FileStatusModel};
use dal::queries::file_queries;
use std::sync::Arc;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::dtos::{
    conflict_error_dto::BusinessConflictError,
    file_dto::{CreateFileDto, FileDto, FileUrlDto, FileWithUploadDto},
    not_found_error_dto::BusinessNotFoundError,
    service_unavailable_error_dto::BusinessServiceUnavailableError,
};
use crate::jobs::MyraJob;

const MAX_FILE_SIZE: i64 = 20_971_520;
const UPLOAD_URL_EXPIRY_SECONDS: u32 = 900;
const DOWNLOAD_URL_EXPIRY_SECONDS: u32 = 3600;
const STALE_PENDING_TIMEOUT_MINUTES: i64 = 10;
const STALE_PROCESSING_TIMEOUT_MINUTES: i64 = 10;

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
    queue: JobQueueHandle<MyraJob>,
}

impl FileService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
            file_provider: providers.file_provider.clone(),
            queue: providers.job_queue.clone(),
        }
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

        self.queue
            .push(MyraJob::ProcessUploadedFile {
                file_id: file.id,
                user_id: file.user_id,
            })
            .await?;

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
