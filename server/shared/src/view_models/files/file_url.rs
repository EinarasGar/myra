use serde::Serialize;

#[derive(Serialize, utoipa::ToSchema)]
pub struct FileUrlResponseViewModel {
    pub url: String,
    pub expires_in_seconds: u32,
}
