use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct FileUrlResponseViewModel {
    pub url: String,
    pub expires_in_seconds: u32,
}
