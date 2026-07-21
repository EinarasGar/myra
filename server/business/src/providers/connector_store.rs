use async_trait::async_trait;
use connectors::models::FetchedPage;
use connectors::port::ConnectorStore;
use connectors::provider::ProviderKind;
use dal::models::connector_models::{AddConnectorRawPageModel, RawPageCursorRow};
use dal::queries::connector_queries;
use dal::secrets::SecretProvider;
use std::sync::Arc;
use uuid::Uuid;

use crate::dtos::connectors::ConnectorConnectionDto;

#[mockall_double::double]
use dal::database_context::MyraDb;
#[mockall_double::double]
use dal::redis_connection::RedisConnection;

pub(crate) fn credential_ref(connection_id: Uuid) -> String {
    format!("connector:{connection_id}")
}

pub struct BusinessConnectorStore {
    db: MyraDb,
    secret_provider: Arc<dyn SecretProvider>,
    redis: RedisConnection,
    provider_account_ref: Option<Uuid>,
    connection_id: Uuid,
    provider_kind: ProviderKind,
    provider_key_id: Option<String>,
}

impl BusinessConnectorStore {
    fn new(
        db: MyraDb,
        secret_provider: Arc<dyn SecretProvider>,
        redis: RedisConnection,
        provider_account_ref: Option<Uuid>,
        connection: &ConnectorConnectionDto,
    ) -> anyhow::Result<Self> {
        Ok(Self {
            db,
            secret_provider,
            redis,
            provider_account_ref,
            connection_id: connection.id,
            provider_kind: connection.provider_kind.parse::<ProviderKind>()?,
            provider_key_id: connection.provider_key_id.clone(),
        })
    }

    /// Store scoped to a provider account — the fetch unit that owns the raw-page archive.
    pub fn for_provider_account(
        db: MyraDb,
        secret_provider: Arc<dyn SecretProvider>,
        redis: RedisConnection,
        provider_account_ref: Uuid,
        connection: &ConnectorConnectionDto,
    ) -> anyhow::Result<Self> {
        Self::new(
            db,
            secret_provider,
            redis,
            Some(provider_account_ref),
            connection,
        )
    }

    /// Store scoped to a connection only (OAuth / account discovery — no page access).
    pub fn for_connection(
        db: MyraDb,
        secret_provider: Arc<dyn SecretProvider>,
        redis: RedisConnection,
        connection: &ConnectorConnectionDto,
    ) -> anyhow::Result<Self> {
        Self::new(db, secret_provider, redis, None, connection)
    }

    fn provider_account_ref(&self) -> anyhow::Result<Uuid> {
        self.provider_account_ref.ok_or_else(|| {
            anyhow::anyhow!("connector store has no provider-account scope for page access")
        })
    }

    fn scoped_cache_key(&self, key: &str) -> String {
        format!("connector:{}:{}", self.connection_id, key)
    }
}

#[async_trait]
impl ConnectorStore for BusinessConnectorStore {
    fn provider_kind(&self) -> ProviderKind {
        self.provider_kind
    }

    fn provider_key_id(&self) -> Option<String> {
        self.provider_key_id.clone()
    }

    async fn latest_cursor(&self) -> anyhow::Result<Option<serde_json::Value>> {
        let provider_account_ref = self.provider_account_ref()?;
        let latest = self
            .db
            .fetch_optional::<RawPageCursorRow>(connector_queries::get_latest_raw_page_cursor(
                provider_account_ref,
            ))
            .await?;
        Ok(latest.and_then(|page| page.cursor_after.map(|j| j.0)))
    }

    async fn append_page(&self, page: &FetchedPage) -> anyhow::Result<()> {
        let provider_account_ref = self.provider_account_ref()?;
        let insert = AddConnectorRawPageModel {
            provider_account_ref,
            stream: page.stream.clone(),
            payload: page.payload.clone(),
            cursor_after: page
                .next_cursor
                .as_ref()
                .and_then(|c| serde_json::to_value(c).ok()),
            payload_hash: connectors::dedup::payload_hash(&page.payload),
        };
        self.db
            .execute(connector_queries::insert_raw_page(insert))
            .await?;

        tracing::info!(provider_account_ref = %provider_account_ref, stream = %page.stream, "archived raw page");
        Ok(())
    }

    async fn get_credential(&self) -> anyhow::Result<Option<Vec<u8>>> {
        self.secret_provider
            .get_secret(&credential_ref(self.connection_id))
            .await
            .map_err(|e| {
                anyhow::anyhow!(
                    "failed to read credential for connection {}: {e}",
                    self.connection_id
                )
            })
    }

    async fn put_credential(&self, value: &[u8]) -> anyhow::Result<()> {
        self.secret_provider
            .store_secret(&credential_ref(self.connection_id), value)
            .await
            .map_err(|e| {
                anyhow::anyhow!(
                    "failed to store credential for connection {}: {e}",
                    self.connection_id
                )
            })
    }

    async fn cache_get(&self, key: &str) -> Option<String> {
        self.redis.get_string(&self.scoped_cache_key(key)).await
    }

    async fn cache_put(&self, key: &str, value: &str, ttl_secs: u64) {
        self.redis
            .set_string_ex(&self.scoped_cache_key(key), value, ttl_secs)
            .await;
    }

    async fn cache_lock(&self, key: &str, ttl_secs: u64) -> bool {
        self.redis
            .set_string_nx_ex(&self.scoped_cache_key(key), "1", ttl_secs)
            .await
    }

    async fn cache_unlock(&self, key: &str) {
        self.redis.del(&self.scoped_cache_key(key)).await;
    }
}
