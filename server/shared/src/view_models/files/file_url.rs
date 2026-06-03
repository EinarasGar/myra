use serde::Serialize;

#[derive(Serialize, utoipa::ToSchema)]
pub struct FileUrlResponseViewModel {
    pub url: String,
    pub expires_in_seconds: u32,
    pub media_type: String,
}

#[cfg(feature = "backend")]
impl From<business::dtos::file_dto::FileUrlDto> for FileUrlResponseViewModel {
    fn from(dto: business::dtos::file_dto::FileUrlDto) -> Self {
        Self {
            url: dto.url,
            expires_in_seconds: dto.expires_in_seconds,
            media_type: dto.media_type,
        }
    }
}
