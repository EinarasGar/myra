use async_trait::async_trait;

use crate::enablebanking::client::EnableBankingClient;
use crate::enablebanking::config::EnableBankingConfig;
use crate::models::account::ProviderAccount;
use crate::models::aspsp::Aspsp;
use crate::port::{Connector, ConnectorStore};
use crate::provider::{BeginOauthOptions, CredentialSource, Provider, ProviderKind};
use crate::Result;

pub struct EnableBankingProvider;

#[async_trait]
impl Provider for EnableBankingProvider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::EnableBanking
    }

    async fn build_connector(
        &self,
        provider_account_id: &str,
        _credential: CredentialSource,
        _store: &dyn ConnectorStore,
    ) -> Result<Box<dyn Connector>> {
        Ok(Box::new(EnableBankingClient::new(
            provider_account_id.to_string(),
        )?))
    }

    fn resolve_provider_account_id(
        &self,
        client_value: Option<String>,
        _store: &dyn ConnectorStore,
    ) -> Result<String> {
        client_value.ok_or_else(|| {
            anyhow::anyhow!("provider_account_id is required for enablebanking bindings")
        })
    }

    async fn list_accounts(&self, store: &dyn ConnectorStore) -> Result<Vec<ProviderAccount>> {
        let session_id = store
            .get_credential()
            .await?
            .ok_or_else(|| anyhow::anyhow!("enablebanking connection has no stored session id"))?;
        let client = EnableBankingClient::new(String::from_utf8(session_id)?)?;
        client.list_accounts().await
    }

    async fn list_aspsps(&self, _store: &dyn ConnectorStore, country: &str) -> Result<Vec<Aspsp>> {
        let body = crate::enablebanking::client::list_aspsps(country).await?;
        Ok(parse_aspsps(&body))
    }

    async fn begin_oauth(
        &self,
        _store: &dyn ConnectorStore,
        state: &str,
        redirect_uri: Option<&str>,
        options: BeginOauthOptions,
    ) -> Result<String> {
        let bank_name = options.bank_name.as_deref().ok_or_else(|| {
            anyhow::anyhow!("enablebanking OAuth requires bank_name")
        })?;
        let bank_country = options.bank_country.as_deref().ok_or_else(|| {
            anyhow::anyhow!("enablebanking OAuth requires bank_country")
        })?;
        let redirect_url = resolve_redirect_uri(redirect_uri)?;
        let config = EnableBankingConfig::get();
        let valid_until =
            time::OffsetDateTime::now_utc() + time::Duration::days(config.consent_days);
        let client = EnableBankingClient::new(String::new())?;
        client
            .start_auth_session(bank_name, bank_country, state, &redirect_url, valid_until)
            .await
    }

    async fn complete_oauth(
        &self,
        store: &dyn ConnectorStore,
        code: &str,
        _redirect_uri: Option<&str>,
    ) -> Result<Option<time::OffsetDateTime>> {
        let client = EnableBankingClient::new(String::new())?;
        let session = client.create_session(code).await?;
        let session_id = session
            .get("session_id")
            .or_else(|| session.get("uid"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("enablebanking /sessions response missing session id"))?
            .to_string();
        store.put_credential(session_id.as_bytes()).await?;

        Ok(Some(
            time::OffsetDateTime::now_utc()
                + time::Duration::days(EnableBankingConfig::get().consent_days),
        ))
    }
}

// Falls back to the single allowlisted URI so callers may omit redirect_uri.
fn resolve_redirect_uri(requested: Option<&str>) -> Result<String> {
    let config = EnableBankingConfig::get();
    let uri = match requested {
        Some(uri) => uri.to_string(),
        None => config
            .redirect_uri_allowlist
            .first()
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("redirect_uri is required"))?,
    };
    if !config.redirect_uri_allowlist.is_empty()
        && !config.redirect_uri_allowlist.iter().any(|a| a == &uri)
    {
        anyhow::bail!("redirect_uri is not allowlisted");
    }
    Ok(uri)
}

fn parse_aspsps(body: &serde_json::Value) -> Vec<Aspsp> {
    let items = body
        .get("aspsps")
        .and_then(|v| v.as_array())
        .or_else(|| body.as_array())
        .cloned()
        .unwrap_or_default();
    items
        .iter()
        .filter_map(|item| {
            let name = item.get("name").and_then(|v| v.as_str())?;
            Some(Aspsp {
                name: name.to_string(),
                country: item
                    .get("country")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::port::MockConnectorStore;
    use serde_json::json;

    #[test]
    fn parse_aspsps_extracts_name_and_country() {
        let aspsps = parse_aspsps(&json!({ "aspsps": [
            { "name": "Nordea", "country": "FI", "cash_account_type": "CURRENT" },
            { "name": "Danske Bank", "country": "DK" },
            { "country": "SE" }
        ]}));
        assert_eq!(aspsps.len(), 2);
        assert_eq!(aspsps[0].name, "Nordea");
        assert_eq!(aspsps[0].country, "FI");
        assert_eq!(aspsps[1].name, "Danske Bank");
    }

    #[test]
    fn parse_aspsps_handles_non_array_body() {
        assert!(parse_aspsps(&json!({ "error": "bad country" })).is_empty());
    }

    #[test]
    fn begin_oauth_requires_bank_name() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let err = rt
            .block_on(EnableBankingProvider.begin_oauth(
                &store_stub(),
                "state",
                None,
                BeginOauthOptions {
                    bank_country: Some("FI".to_string()),
                    ..Default::default()
                },
            ))
            .unwrap_err();
        assert!(err.to_string().contains("bank_name"));
    }

    #[test]
    fn begin_oauth_requires_bank_country() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let err = rt
            .block_on(EnableBankingProvider.begin_oauth(
                &store_stub(),
                "state",
                None,
                BeginOauthOptions {
                    bank_name: Some("Nordea".to_string()),
                    ..Default::default()
                },
            ))
            .unwrap_err();
        assert!(err.to_string().contains("bank_country"));
    }

    #[test]
    fn unallowlisted_redirect_is_rejected_before_network_call() {
        std::env::set_var(
            "ENABLEBANKING_REDIRECT_URI_ALLOWLIST",
            "https://app.example/cb",
        );
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let err = rt
            .block_on(async {
                resolve_redirect_uri(Some("https://evil.example")).map_err(|e| e)
            })
            .unwrap_err();
        assert!(err.to_string().contains("allowlisted"));
        std::env::remove_var("ENABLEBANKING_REDIRECT_URI_ALLOWLIST");
    }

    fn store_stub() -> MockConnectorStore {
        let mut store = MockConnectorStore::new();
        store.expect_get_credential().returning(|| Ok(None));
        store.expect_put_credential().returning(|_| Ok(()));
        store
    }
}
