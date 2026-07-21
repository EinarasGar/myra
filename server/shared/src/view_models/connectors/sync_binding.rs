#[cfg(feature = "backend")]
use business::dtos::connectors::SyncReportDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SyncBindingRequestViewModel {
    pub credential: Option<String>,
}

/// Outcome counts of one committed sync run — empty (all zeros bar `unchanged`) when the
/// provider had nothing new.
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SyncReportViewModel {
    pub new_transactions: i64,
    pub unchanged: i64,
    pub amended: i64,
    pub conflicts: i64,
    pub unresolved: i64,
    pub duplicates: i64,
    pub pages_projected: i64,
}

#[cfg(feature = "backend")]
impl From<SyncReportDto> for SyncReportViewModel {
    fn from(report: SyncReportDto) -> Self {
        Self {
            new_transactions: report.new_transactions as i64,
            unchanged: report.unchanged as i64,
            amended: report.amended as i64,
            conflicts: report.conflicts as i64,
            unresolved: report.unresolved as i64,
            duplicates: report.duplicates as i64,
            pages_projected: report.pages_projected as i64,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SyncBindingResponseViewModel {
    pub binding_id: uuid::Uuid,
    pub status: String,
    pub pages_fetched: Option<i32>,
    pub report: Option<SyncReportViewModel>,
}
