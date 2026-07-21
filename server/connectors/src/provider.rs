use std::str::FromStr;

use async_trait::async_trait;
use serde_json::Value;

use crate::models::account::ProviderAccount;
use crate::models::transaction::MappedTransaction;
use crate::port::{Connector, ConnectorStore};
use crate::trading212::provider::Trading212Provider;
use crate::truelayer::provider::TrueLayerProvider;
use crate::Result;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderKind {
    Trading212,
    TrueLayer,
}

impl ProviderKind {
    pub fn as_str(self) -> &'static str {
        match self {
            ProviderKind::Trading212 => "trading212",
            ProviderKind::TrueLayer => "truelayer",
        }
    }

    pub fn map_item(self, stream: &str, item: &Value) -> Option<MappedTransaction> {
        match self {
            ProviderKind::Trading212 => match stream {
                "transactions" => Some(crate::trading212::mapper::map_transaction(item)),
                "orders" => Some(crate::trading212::mapper::map_order(item)),
                "dividends" => Some(crate::trading212::mapper::map_dividend(item)),
                _ => None,
            },
            ProviderKind::TrueLayer => match stream {
                "transactions" => Some(crate::truelayer::mapper::map_transaction(item)),
                _ => None,
            },
        }
    }
}

impl FromStr for ProviderKind {
    type Err = anyhow::Error;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "trading212" => Ok(ProviderKind::Trading212),
            "truelayer" => Ok(ProviderKind::TrueLayer),
            other => anyhow::bail!("unknown provider kind: {other}"),
        }
    }
}

pub enum CredentialSource {
    Stored,
    Transient(String),
}

#[async_trait]
pub trait Provider: Send + Sync {
    fn kind(&self) -> ProviderKind;

    async fn build_connector(
        &self,
        provider_account_id: &str,
        credential: CredentialSource,
        store: &dyn ConnectorStore,
    ) -> Result<Box<dyn Connector>>;

    fn resolve_provider_account_id(
        &self,
        client_value: Option<String>,
        store: &dyn ConnectorStore,
    ) -> Result<String>;

    async fn list_accounts(&self, store: &dyn ConnectorStore) -> Result<Vec<ProviderAccount>>;

    fn needs_attended_backfill(&self) -> bool {
        false
    }

    fn begin_oauth(&self, _store: &dyn ConnectorStore, _state: &str) -> Result<String> {
        anyhow::bail!("provider does not support OAuth: {}", self.kind().as_str())
    }

    async fn complete_oauth(
        &self,
        _store: &dyn ConnectorStore,
        _code: &str,
    ) -> Result<Option<time::OffsetDateTime>> {
        anyhow::bail!("provider does not support OAuth: {}", self.kind().as_str())
    }
}

pub(crate) fn map_pages(
    kind: ProviderKind,
    pages: &[crate::models::sync::RawPage],
) -> Vec<crate::models::transaction::ProviderTransaction> {
    let mut transactions = Vec::new();
    let mut skipped = Vec::new();
    for page in pages {
        let Some(items) = page.payload.as_array() else {
            continue;
        };
        for item in items {
            match kind.map_item(&page.stream, item) {
                Some(MappedTransaction::Provider(p)) => transactions.push(p),
                Some(MappedTransaction::Skipped(s)) => skipped.push(s),
                None => {}
            }
        }
    }
    crate::models::transaction::log_skipped(kind.as_str(), &skipped);
    transactions
}

impl ProviderKind {
    pub fn provider(self) -> &'static dyn Provider {
        static TRADING212: Trading212Provider = Trading212Provider;
        static TRUELAYER: TrueLayerProvider = TrueLayerProvider;
        match self {
            ProviderKind::Trading212 => &TRADING212,
            ProviderKind::TrueLayer => &TRUELAYER,
        }
    }
}
