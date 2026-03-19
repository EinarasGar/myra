use business::dtos::file_dto::FileDto;
use serde::Serialize;
use time::OffsetDateTime;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, ToSchema)]
pub struct GetFileResponseViewModel {
    pub id: Uuid,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub status: String,
    pub has_thumbnail: bool,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

impl From<FileDto> for GetFileResponseViewModel {
    fn from(dto: FileDto) -> Self {
        Self {
            id: dto.id,
            original_name: dto.original_name,
            mime_type: dto.mime_type,
            size_bytes: dto.size_bytes,
            status: dto.status,
            has_thumbnail: dto.has_thumbnail,
            created_at: dto.created_at,
            updated_at: dto.updated_at,
        }
    }
}
