use std::collections::HashMap;
use time::OffsetDateTime;
use uuid::Uuid;

pub struct CreateFileDto {
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: i64,
}

pub struct FileDto {
    pub id: Uuid,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub status: String,
    pub has_thumbnail: bool,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

pub struct FileWithUploadDto {
    pub file: FileDto,
    pub upload_url: String,
    pub upload_method: String,
    pub upload_headers: HashMap<String, String>,
    pub upload_expires_in_seconds: u32,
}

pub struct FileUrlDto {
    pub url: String,
    pub expires_in_seconds: u32,
}

impl From<dal::models::file_models::FileModel> for FileDto {
    fn from(model: dal::models::file_models::FileModel) -> Self {
        let has_thumbnail = model.thumbnail_key.is_some();
        Self {
            id: model.id,
            original_name: model.original_name,
            mime_type: model.mime_type,
            size_bytes: model.size_bytes,
            status: model.status,
            has_thumbnail,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}
