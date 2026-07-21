#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::connector_models::{
    AddConnectorBindingModel, AddConnectorConnectionModel, AddConnectorProviderAccountModel,
    ConnectorBindingRow, ConnectorConnectionRow,
};
use dal::queries::connector_queries;
use dal::query_params::connector_params::{
    GetConnectorBindingsParams, GetConnectorConnectionsParams,
};
#[mockall_double::double]
use dal::redis_connection::RedisConnection;
use dal::secrets::SecretProvider;

use connectors::port::ConnectorStore;
use itertools::Itertools;

use crate::dtos::bad_request_error_dto::BusinessBadRequestError;
use crate::dtos::connectors::{
    BindingStatusDto, BindingUpdateStatusDto, BindingWriteModeDto, ConnectionStatusDto,
    ConnectorBindingDto, ConnectorConnectionDto, CredentialModeDto, OAuthSessionStartDto,
    ProviderAccountDto,
};
use crate::dtos::not_found_error_dto::BusinessNotFoundError;
use crate::providers::connector_store::BusinessConnectorStore;

use std::sync::Arc;
use uuid::Uuid;

use super::accounts_service::AccountsService;
use super::ServiceProviders;

pub struct ConnectorService {
    db: MyraDb,
    secret_provider: Arc<dyn SecretProvider>,
    redis: RedisConnection,
    accounts: AccountsService,
}

impl ConnectorService {
    pub fn new(providers: &ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
            secret_provider: providers.secret_provider.clone(),
            redis: providers.redis.clone(),
            accounts: AccountsService::new(providers),
        }
    }

    fn store_for_connection(
        &self,
        connection: &ConnectorConnectionDto,
    ) -> anyhow::Result<BusinessConnectorStore> {
        BusinessConnectorStore::for_connection(
            self.db.clone(),
            self.secret_provider.clone(),
            self.redis.clone(),
            connection,
        )
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn create_connection(
        &self,
        user_id: Uuid,
        provider_kind: String,
        credential_mode: CredentialModeDto,
        provider_key_id: Option<String>,
        credential_bytes: Option<String>,
    ) -> anyhow::Result<Uuid> {
        let provider_id_query =
            connector_queries::get_connector_provider_id_by_kind(provider_kind.clone());
        let provider_id: Uuid = self
            .db
            .fetch_one_scalar(provider_id_query)
            .await
            .map_err(|_| anyhow::anyhow!("unknown provider kind: {provider_kind}"))?;

        let model = AddConnectorConnectionModel {
            user_id,
            provider_id,
            credential_mode: credential_mode.as_str().to_string(),
            provider_key_id,
            status: ConnectionStatusDto::Active.as_str().to_string(),
            consent_expires_at: None,
        };

        let query = connector_queries::insert_connector_connection(model);
        let connection_id: Uuid = self.db.fetch_one_scalar(query).await?;

        if credential_mode == CredentialModeDto::Stored {
            if let Some(cred) = credential_bytes {
                let secret_key = crate::providers::connector_store::credential_ref(connection_id);
                self.secret_provider
                    .store_secret(&secret_key, cred.as_bytes())
                    .await?;
            }
        }

        Ok(connection_id)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn list_connections(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<ConnectorConnectionDto>> {
        let params = GetConnectorConnectionsParams::all(user_id);
        let query = connector_queries::get_connector_connections(params);
        let results = self.db.fetch_all::<ConnectorConnectionRow>(query).await?;

        Ok(results.into_iter().map_into().collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
    pub async fn get_connection(
        &self,
        user_id: Uuid,
        connection_id: Uuid,
    ) -> anyhow::Result<ConnectorConnectionDto> {
        let query = connector_queries::get_connector_connections(
            GetConnectorConnectionsParams::by_id(user_id, connection_id),
        );
        let result = self
            .db
            .fetch_optional::<ConnectorConnectionRow>(query)
            .await?
            .ok_or_else(|| {
                anyhow::Error::new(BusinessNotFoundError {
                    message: format!("connection {connection_id} not found"),
                })
            })?;

        Ok(result.into())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
    pub async fn list_provider_accounts(
        &self,
        user_id: Uuid,
        connection_id: Uuid,
    ) -> anyhow::Result<Vec<ProviderAccountDto>> {
        let connection = self.get_connection(user_id, connection_id).await?;

        let store = self.store_for_connection(&connection)?;
        let accounts = store
            .provider_kind()
            .provider()
            .list_accounts(&store)
            .await
            .map_err(|e| {
                anyhow::Error::new(BusinessBadRequestError {
                    message: e.to_string(),
                })
            })?;

        Ok(accounts.into_iter().map(Into::into).collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
    pub async fn revoke_connection(
        &self,
        user_id: Uuid,
        connection_id: Uuid,
    ) -> anyhow::Result<()> {
        self.get_connection(user_id, connection_id).await?;

        let secret_key = crate::providers::connector_store::credential_ref(connection_id);
        if let Err(e) = self.secret_provider.delete_secret(&secret_key).await {
            tracing::warn!("failed to delete secret for revoked connection {connection_id}: {e}");
        }

        let query = connector_queries::update_connector_connection_status(
            user_id,
            connection_id,
            ConnectionStatusDto::Revoked.as_str().to_string(),
        );
        self.db.execute(query).await?;

        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
    pub async fn get_binding(
        &self,
        user_id: Uuid,
        binding_id: Uuid,
    ) -> anyhow::Result<ConnectorBindingDto> {
        let query = connector_queries::get_connector_bindings(GetConnectorBindingsParams::by_id(
            user_id, binding_id,
        ));
        let result = self
            .db
            .fetch_optional::<ConnectorBindingRow>(query)
            .await?
            .ok_or_else(|| {
                anyhow::Error::new(BusinessNotFoundError {
                    message: format!("binding {binding_id} not found"),
                })
            })?;

        Ok(result.into())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn list_bindings(&self, user_id: Uuid) -> anyhow::Result<Vec<ConnectorBindingDto>> {
        let params = GetConnectorBindingsParams::all(user_id);
        let query = connector_queries::get_connector_bindings(params);
        let results = self.db.fetch_all::<ConnectorBindingRow>(query).await?;

        Ok(results.into_iter().map(Into::into).collect())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(connection_id = %connection_id, user_id = %user_id))]
    pub async fn create_binding(
        &self,
        connection_id: Uuid,
        user_id: Uuid,
        sverto_account_id: Uuid,
        provider_account_id: Option<String>,
        write_mode: String,
    ) -> anyhow::Result<Uuid> {
        let connection = self.get_connection(user_id, connection_id).await?;

        self.accounts
            .get_account_with_metadata(user_id, sverto_account_id)
            .await?;

        let store = self.store_for_connection(&connection)?;
        let external_account_id = store
            .provider_kind()
            .provider()
            .resolve_provider_account_id(provider_account_id, &store)
            .map_err(|e| {
                anyhow::Error::new(BusinessBadRequestError {
                    message: e.to_string(),
                })
            })?;

        let provider_account_ref: Uuid = self
            .db
            .fetch_one_scalar(connector_queries::get_or_create_provider_account(
                AddConnectorProviderAccountModel {
                    connection_id,
                    external_account_id,
                },
            ))
            .await?;

        let model = AddConnectorBindingModel {
            provider_account_ref,
            sverto_account_id,
            write_mode,
            status: BindingStatusDto::Active.as_str().to_string(),
        };

        let query = connector_queries::insert_connector_binding(model);
        let binding_id: Uuid = self.db.fetch_one_scalar(query).await?;

        Ok(binding_id)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
    pub async fn update_binding(
        &self,
        user_id: Uuid,
        binding_id: Uuid,
        write_mode: BindingWriteModeDto,
        status: BindingUpdateStatusDto,
    ) -> anyhow::Result<()> {
        let query = connector_queries::update_connector_binding(
            user_id,
            binding_id,
            Some(write_mode.as_str().to_string()),
            status.as_str().to_string(),
        );
        self.db.execute(query).await?;

        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
    pub async fn delete_binding(&self, user_id: Uuid, binding_id: Uuid) -> anyhow::Result<()> {
        let query = connector_queries::update_connector_binding(
            user_id,
            binding_id,
            None,
            BindingStatusDto::Revoked.as_str().to_string(),
        );
        self.db.execute(query).await?;

        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
    pub async fn begin_oauth_session(
        &self,
        user_id: Uuid,
        connection_id: Uuid,
    ) -> anyhow::Result<OAuthSessionStartDto> {
        let connection = self.get_connection(user_id, connection_id).await?;
        let store = self.store_for_connection(&connection)?;

        let session_id = Uuid::new_v4().to_string();
        let state = Uuid::new_v4().to_string();
        let key = format!("oauth:state:{}:{}", user_id, session_id);
        self.redis.set_string_ex(&key, &state, 300).await;

        let auth_url = store
            .provider_kind()
            .provider()
            .begin_oauth(&store, &state)
            .map_err(|e| {
                anyhow::Error::new(BusinessBadRequestError {
                    message: e.to_string(),
                })
            })?;

        Ok(OAuthSessionStartDto {
            session_id,
            auth_url,
        })
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
    pub async fn complete_oauth(
        &self,
        user_id: Uuid,
        connection_id: Uuid,
        code: &str,
    ) -> anyhow::Result<()> {
        let connection = self.get_connection(user_id, connection_id).await?;
        let store = self.store_for_connection(&connection)?;

        let consent_expires_at = store
            .provider_kind()
            .provider()
            .complete_oauth(&store, code)
            .await?;

        let query = connector_queries::activate_connector_connection(
            user_id,
            connection_id,
            consent_expires_at,
        );
        self.db.execute(query).await?;

        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, session_id = %session_id))]
    pub async fn validate_oauth_state(&self, user_id: Uuid, session_id: &str, state: &str) -> bool {
        let key = format!("oauth:state:{}:{}", user_id, session_id);

        if let Some(stored_state) = self.redis.get_string(&key).await {
            self.redis.del(&key).await;
            return stored_state == state;
        }

        false
    }
}
