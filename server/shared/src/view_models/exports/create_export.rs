use serde::{Deserialize, Serialize};

pub use super::get_exports::IdentifiableExportViewModel;

/// The format of an export. Serde representation is lowercase (e.g. "csv", "beancount").
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormatViewModel {
    Csv,
    Beancount,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CreateExportRequestViewModel {
    pub format: ExportFormatViewModel,
}

/// The export created by the request. Re-uses the shared `IdentifiableExportViewModel`.
pub type CreateExportResponseViewModel = IdentifiableExportViewModel;

#[cfg(feature = "backend")]
impl From<business::dtos::exports::export_dto::ExportFormat> for ExportFormatViewModel {
    fn from(format: business::dtos::exports::export_dto::ExportFormat) -> Self {
        match format {
            business::dtos::exports::export_dto::ExportFormat::Csv => Self::Csv,
            business::dtos::exports::export_dto::ExportFormat::Beancount => Self::Beancount,
        }
    }
}
