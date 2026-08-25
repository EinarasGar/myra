use shared::view_models::exports::create_export::ExportFormatViewModel;
use shared::view_models::exports::get_exports::{
    GetExportsResponseViewModel, IdentifiableExportViewModel,
};

use crate::models::{ExportFormat, LedgerExport};

pub fn extract_export(body: &str) -> Result<LedgerExport, String> {
    let vm: IdentifiableExportViewModel = serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(export_from(vm))
}

pub fn extract_exports(body: &str) -> Result<Vec<LedgerExport>, String> {
    let resp: GetExportsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp.exports.into_iter().map(export_from).collect())
}

pub fn format_body(format: ExportFormat) -> String {
    let value = match format {
        ExportFormat::Csv => "csv",
        ExportFormat::Beancount => "beancount",
    };
    format!("{{\"format\":\"{}\"}}", value)
}

fn export_from(vm: IdentifiableExportViewModel) -> LedgerExport {
    LedgerExport {
        id: vm.id.to_string(),
        format: match vm.format {
            ExportFormatViewModel::Csv => ExportFormat::Csv,
            ExportFormatViewModel::Beancount => ExportFormat::Beancount,
        },
        created_at: vm.created_at,
        size_bytes: vm.size_bytes,
    }
}
