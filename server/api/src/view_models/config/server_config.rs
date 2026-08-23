use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::server_auth_provider::ServerAuthProviderViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ServerConfigViewModel {
    pub auth_provider: ServerAuthProviderViewModel,
    pub version: String,
}
