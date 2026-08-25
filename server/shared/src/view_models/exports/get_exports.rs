use super::create_export::ExportFormatViewModel;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableExportViewModel {
    pub id: Uuid,
    pub format: ExportFormatViewModel,
    pub created_at: String,
    pub size_bytes: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetExportsResponseViewModel {
    pub exports: Vec<IdentifiableExportViewModel>,
}

#[cfg(feature = "backend")]
impl From<business::dtos::exports::export_dto::ExportDto> for IdentifiableExportViewModel {
    fn from(dto: business::dtos::exports::export_dto::ExportDto) -> Self {
        Self {
            id: dto.id,
            format: dto.format.into(),
            created_at: dto
                .created_at
                .format(&time::format_description::well_known::Rfc3339)
                .unwrap_or_default(),
            size_bytes: dto.size_bytes,
        }
    }
}
