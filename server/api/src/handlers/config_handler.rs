use axum::Json;

use crate::view_models::config::{
    server_auth_provider::ServerAuthProviderViewModel, server_config::ServerConfigViewModel,
};

/// Get server configuration
///
/// Returns the server's auth provider mode and version. Public endpoint, no authentication required.
#[utoipa::path(
    get,
    path = "/api/config",
    tag = "Configuration",
    responses((status = 200, description = "Server configuration", body = ServerConfigViewModel))
)]
pub async fn get_config() -> Json<ServerConfigViewModel> {
    Json(ServerConfigViewModel {
        auth_provider: {
            #[cfg(feature = "clerk")]
            {
                ServerAuthProviderViewModel::Clerk
            }
            #[cfg(feature = "database")]
            {
                ServerAuthProviderViewModel::Database
            }
            #[cfg(feature = "noauth")]
            {
                ServerAuthProviderViewModel::Noauth
            }
        },
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(feature = "database")]
    #[tokio::test]
    async fn get_config_returns_database_under_database_feature() {
        let Json(config) = get_config().await;
        assert_eq!(config.auth_provider, ServerAuthProviderViewModel::Database);
        assert!(!config.version.is_empty());
    }

    #[cfg(feature = "noauth")]
    #[tokio::test]
    async fn get_config_returns_noauth_under_noauth_feature() {
        let Json(config) = get_config().await;
        assert_eq!(config.auth_provider, ServerAuthProviderViewModel::Noauth);
        assert!(!config.version.is_empty());
    }

    #[cfg(feature = "clerk")]
    #[tokio::test]
    async fn get_config_returns_clerk_under_clerk_feature() {
        let Json(config) = get_config().await;
        assert_eq!(config.auth_provider, ServerAuthProviderViewModel::Clerk);
        assert!(!config.version.is_empty());
    }
}
