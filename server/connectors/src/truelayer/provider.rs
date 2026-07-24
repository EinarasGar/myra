use async_trait::async_trait;

use crate::models::account::ProviderAccount;
use crate::port::{Connector, ConnectorStore};
use crate::provider::{CredentialSource, Provider, ProviderKind};
use crate::truelayer::client::TrueLayerClient;
use crate::truelayer::config::TrueLayerConfig;
use crate::Result;

pub struct TrueLayerProvider;

#[async_trait]
impl Provider for TrueLayerProvider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::TrueLayer
    }

    fn needs_attended_backfill(&self) -> bool {
        true
    }

    async fn build_connector(
        &self,
        provider_account_id: &str,
        credential: CredentialSource,
        store: &dyn ConnectorStore,
    ) -> Result<Box<dyn Connector>> {
        let access_token = match credential {
            CredentialSource::Transient(token) => token,
            CredentialSource::Stored => crate::truelayer::auth::access_token(store).await?,
        };
        Ok(Box::new(TrueLayerClient::new(
            access_token,
            provider_account_id.to_string(),
        )))
    }

    fn resolve_provider_account_id(
        &self,
        client_value: Option<String>,
        _store: &dyn ConnectorStore,
    ) -> Result<String> {
        client_value.ok_or_else(|| {
            anyhow::anyhow!("provider_account_id is required for truelayer bindings")
        })
    }

    async fn list_accounts(&self, store: &dyn ConnectorStore) -> Result<Vec<ProviderAccount>> {
        let access_token = crate::truelayer::auth::access_token(store).await?;
        TrueLayerClient::list_accounts(&access_token).await
    }

    fn begin_oauth(
        &self,
        _store: &dyn ConnectorStore,
        state: &str,
        redirect_uri: Option<&str>,
    ) -> Result<String> {
        let uri =
            crate::truelayer::auth::resolve_redirect_uri(TrueLayerConfig::get(), redirect_uri)?;
        Ok(crate::truelayer::auth::build_auth_link(state, &uri))
    }

    async fn complete_oauth(
        &self,
        store: &dyn ConnectorStore,
        code: &str,
        redirect_uri: Option<&str>,
    ) -> Result<Option<time::OffsetDateTime>> {
        let uri =
            crate::truelayer::auth::resolve_redirect_uri(TrueLayerConfig::get(), redirect_uri)?;
        let token = crate::truelayer::auth::exchange_code(code, &uri).await?;
        store.put_credential(token.refresh_token.as_bytes()).await?;

        Ok(Some(
            time::OffsetDateTime::now_utc() + time::Duration::days(90),
        ))
    }
}
