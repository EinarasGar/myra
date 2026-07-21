use async_trait::async_trait;

use crate::models::account::ProviderAccount;
use crate::port::{Connector, ConnectorStore};
use crate::provider::{CredentialSource, Provider, ProviderKind};
use crate::trading212::client::{Trading212Client, Trading212Env};
use crate::Result;

pub struct Trading212Provider;

#[async_trait]
impl Provider for Trading212Provider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::Trading212
    }

    async fn build_connector(
        &self,
        _provider_account_id: &str,
        credential: CredentialSource,
        store: &dyn ConnectorStore,
    ) -> Result<Box<dyn Connector>> {
        let api_key_id = store
            .provider_key_id()
            .ok_or_else(|| anyhow::anyhow!("trading212 connection has no provider_key_id"))?;
        let api_secret = match credential {
            CredentialSource::Transient(secret) => secret,
            CredentialSource::Stored => {
                let bytes = store
                    .get_credential()
                    .await?
                    .ok_or_else(|| anyhow::anyhow!("Credential not found"))?;
                String::from_utf8(bytes)?
            }
        };
        Ok(Box::new(Trading212Client::new(
            api_key_id,
            api_secret,
            Trading212Env::Live,
        )))
    }

    fn resolve_provider_account_id(
        &self,
        _client_value: Option<String>,
        store: &dyn ConnectorStore,
    ) -> Result<String> {
        Ok(store
            .provider_key_id()
            .unwrap_or_else(|| "default".to_string()))
    }

    async fn list_accounts(&self, store: &dyn ConnectorStore) -> Result<Vec<ProviderAccount>> {
        Ok(vec![ProviderAccount {
            provider_account_id: store
                .provider_key_id()
                .unwrap_or_else(|| "default".to_string()),
            display_name: "Trading212".to_string(),
            currency: None,
            account_type: None,
        }])
    }
}
