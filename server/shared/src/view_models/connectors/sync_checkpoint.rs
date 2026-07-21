use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetSyncCheckpointResponseViewModel {
    pub cursor: Option<serde_json::Value>,
    pub synced_through: Option<time::OffsetDateTime>,
}
