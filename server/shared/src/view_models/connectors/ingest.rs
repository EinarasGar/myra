use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::sync_binding::SyncReportViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IngestStreamViewModel {
    pub stream: String,
    pub items: Vec<serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IngestTransactionsRequestViewModel {
    pub provider_kind: String,
    pub streams: Vec<IngestStreamViewModel>,
    pub raw_balance: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IngestTransactionsResponseViewModel {
    pub next_cursor: Option<serde_json::Value>,
    pub report: Option<SyncReportViewModel>,
}
