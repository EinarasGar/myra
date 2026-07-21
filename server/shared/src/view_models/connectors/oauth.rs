use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::ConnectorConnectionViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateOAuthSessionResponseViewModel {
    pub session_id: String,
    pub auth_url: String,
}

/// Relays the provider's OAuth redirect back to the server. Per RFC 6749 the provider
/// returns either `code` (consent granted) or `error` (e.g. access_denied) — never both.
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CompleteOAuthSessionRequestViewModel {
    pub state: String,
    pub code: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum OAuthSessionStatus {
    Completed,
    Denied,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CompleteOAuthSessionResponseViewModel {
    pub status: OAuthSessionStatus,
    pub connection: ConnectorConnectionViewModel,
}
