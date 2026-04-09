use super::base_models::{
    file_name::FileName, file_size_bytes::FileSizeBytes, mime_type::MimeType,
};
#[cfg(feature = "backend")]
use business::dtos::file_dto::FileWithUploadDto;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Deserialize, utoipa::ToSchema)]
pub struct CreateFileRequestViewModel {
    pub original_name: FileName,
    pub mime_type: MimeType,
    pub size_bytes: FileSizeBytes,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct CreateFileResponseViewModel {
    pub id: Uuid,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub status: String,
    pub has_thumbnail: bool,
    pub upload_metadata: UploadMetadataViewModel,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct UploadMetadataViewModel {
    pub upload_url: String,
    pub upload_method: String,
    pub upload_headers: HashMap<String, String>,
    pub upload_expires_in_seconds: u32,
}

#[cfg(feature = "backend")]
impl From<FileWithUploadDto> for CreateFileResponseViewModel {
    fn from(dto: FileWithUploadDto) -> Self {
        Self {
            id: dto.file.id,
            original_name: dto.file.original_name,
            mime_type: dto.file.mime_type,
            size_bytes: dto.file.size_bytes,
            status: dto.file.status,
            has_thumbnail: dto.file.has_thumbnail,
            upload_metadata: UploadMetadataViewModel {
                upload_url: dto.upload_url,
                upload_method: dto.upload_method,
                upload_headers: dto.upload_headers,
                upload_expires_in_seconds: dto.upload_expires_in_seconds,
            },
            created_at: dto.file.created_at,
            updated_at: dto.file.updated_at,
        }
    }
}
