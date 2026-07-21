use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::CredentialMode;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateConnectionRequestViewModel {
    pub provider_kind: String,
    pub credential_mode: CredentialMode,
    pub credential: Option<String>,
    /// Non-secret credential identifier (e.g. Trading 212's API Key ID). Not routed
    /// through SecretProvider — only the actual secret half needs vault-grade storage.
    pub provider_key_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateConnectionResponseViewModel {
    pub connection_id: uuid::Uuid,
}
