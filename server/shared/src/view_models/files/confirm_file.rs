#[cfg(feature = "backend")]
use business::dtos::file_dto::FileDto;
use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Serialize, utoipa::ToSchema)]
pub struct ConfirmFileResponseViewModel {
    pub id: Uuid,
    pub status: String,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[cfg(feature = "backend")]
impl From<FileDto> for ConfirmFileResponseViewModel {
    fn from(dto: FileDto) -> Self {
        Self {
            id: dto.id,
            status: dto.status,
            updated_at: dto.updated_at,
        }
    }
}
