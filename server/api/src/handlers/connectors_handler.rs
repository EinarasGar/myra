use axum::{extract::Path, http::StatusCode, Json};
use business::dtos::connectors::{
    ClientSuppliedStreamDto, CredentialModeDto, SyncDispatchDto, SyncOutcomeDto,
    TransientSyncCredentialDto,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub(crate) struct ConnectionIdPath {
    connection_id: Uuid,
}

#[derive(Deserialize)]
pub(crate) struct BindingIdPath {
    binding_id: Uuid,
}

#[derive(Deserialize)]
pub(crate) struct ConnectionSessionPath {
    connection_id: Uuid,
    session_id: String,
}

use crate::{
    auth::AuthenticatedUserId,
    errors::ApiError,
    extractors::ValidatedJson,
    states::{ConnectorServiceState, ConnectorSyncServiceState},
    view_models::connectors::{
        base_models::ConnectorBindingViewModel,
        create_binding::{CreateBindingRequestViewModel, CreateBindingResponseViewModel},
        create_connection::{CreateConnectionRequestViewModel, CreateConnectionResponseViewModel},
        get_bindings::GetBindingsResponseViewModel,
        get_connections::GetConnectionsResponseViewModel,
        ingest::{IngestTransactionsRequestViewModel, IngestTransactionsResponseViewModel},
        list_provider_accounts::ListProviderAccountsResponseViewModel,
        oauth::{
            CompleteOAuthSessionRequestViewModel, CompleteOAuthSessionResponseViewModel,
            CreateOAuthSessionResponseViewModel, OAuthSessionStatus,
        },
        sync_binding::{SyncBindingRequestViewModel, SyncBindingResponseViewModel},
        sync_checkpoint::GetSyncCheckpointResponseViewModel,
        update_binding::UpdateBindingRequestViewModel,
    },
    view_models::errors::{CreateResponses, DeleteResponses, GetResponses, UpdateResponses},
};

/// Create Connection
///
/// Creates a new connector connection for the user.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/connectors/connections",
    tag = "Connectors",
    responses(
        (status = 201, description = "Connection created successfully.", body = CreateConnectionResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
    ),
    request_body(
        content = CreateConnectionRequestViewModel,
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn create_connection(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    ConnectorServiceState(connector_service): ConnectorServiceState,
    ValidatedJson(body): ValidatedJson<CreateConnectionRequestViewModel>,
) -> Result<Json<CreateConnectionResponseViewModel>, ApiError> {
    let connection_id = connector_service
        .create_connection(
            user_id,
            body.provider_kind,
            body.credential_mode.to_business(),
            body.provider_key_id,
            body.credential,
        )
        .await?;

    Ok(Json(CreateConnectionResponseViewModel { connection_id }))
}

/// List Connections
///
/// Gets all connector connections associated with the user.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/connectors/connections",
    tag = "Connectors",
    responses(
        (status = 200, description = "Connections retrieved successfully.", body = GetConnectionsResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn list_connections(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    ConnectorServiceState(connector_service): ConnectorServiceState,
) -> Result<Json<GetConnectionsResponseViewModel>, ApiError> {
    let connections = connector_service.list_connections(user_id).await?;

    Ok(Json(GetConnectionsResponseViewModel {
        connections: connections.into_iter().map(Into::into).collect(),
    }))
}

/// Revoke Connection
///
/// Revokes a specific connector connection.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/connectors/connections/{connection_id}",
    tag = "Connectors",
    responses(
        (status = 200, description = "Connection revoked successfully."),
        DeleteResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("connection_id" = Uuid, Path, description = "Id of the connection to revoke."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
pub async fn revoke_connection(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConnectionIdPath { connection_id }): Path<ConnectionIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
) -> Result<(), ApiError> {
    connector_service
        .revoke_connection(user_id, connection_id)
        .await?;
    Ok(())
}

/// Create OAuth Session
///
/// Creates an OAuth authorization session for a connection and returns the provider consent URL.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/connectors/connections/{connection_id}/oauth/sessions",
    tag = "Connectors",
    responses(
        (status = 201, description = "OAuth session created successfully.", body = CreateOAuthSessionResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("connection_id" = Uuid, Path, description = "Id of the connection to authorize."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
pub async fn create_oauth_session(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConnectionIdPath { connection_id }): Path<ConnectionIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
) -> Result<(StatusCode, Json<CreateOAuthSessionResponseViewModel>), ApiError> {
    let session = connector_service
        .begin_oauth_session(user_id, connection_id)
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateOAuthSessionResponseViewModel {
            session_id: session.session_id,
            auth_url: session.auth_url,
        }),
    ))
}

/// Complete OAuth Session
///
/// Completes an OAuth session with the provider redirect result. Consent denial is a valid
/// outcome and returns 200 with status `denied` — not an error response.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/connectors/connections/{connection_id}/oauth/sessions/{session_id}",
    tag = "Connectors",
    responses(
        (status = 200, description = "OAuth session completed.", body = CompleteOAuthSessionResponseViewModel),
        (status = 404, description = "Session not found, expired, or state mismatch."),
        UpdateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("connection_id" = Uuid, Path, description = "Id of the connection being authorized."),
        ("session_id" = String, Path, description = "Id of the OAuth session to complete."),
    ),
    request_body(
        content = CompleteOAuthSessionRequestViewModel,
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, connection_id = %connection_id, session_id = %session_id))]
pub async fn complete_oauth_session(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConnectionSessionPath {
        connection_id,
        session_id,
    }): Path<ConnectionSessionPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
    ConnectorSyncServiceState(sync_service): ConnectorSyncServiceState,
    ValidatedJson(body): ValidatedJson<CompleteOAuthSessionRequestViewModel>,
) -> Result<Json<CompleteOAuthSessionResponseViewModel>, ApiError> {
    // State is validated even on provider-error redirects — RFC 6749 error responses still
    // carry state, and skipping the check would let a forged request cancel a pending flow.
    if !connector_service
        .validate_oauth_state(user_id, &session_id, &body.state)
        .await
    {
        return Err(ApiError::NotFound(
            "oauth session not found or expired".to_string(),
        ));
    }

    if let Some(error) = body.error {
        let detail = body.error_description.unwrap_or_default();
        tracing::info!(error = %error, detail = %detail, "oauth consent denied by user");
        let connection = connector_service
            .get_connection(user_id, connection_id)
            .await?;
        return Ok(Json(CompleteOAuthSessionResponseViewModel {
            status: OAuthSessionStatus::Denied,
            connection: connection.into(),
        }));
    }

    let code = body.code.ok_or_else(|| {
        ApiError::BadRequest("code is required when no OAuth error is present".to_string())
    })?;

    connector_service
        .complete_oauth(user_id, connection_id, &code)
        .await?;

    if let Err(e) = sync_service
        .run_attended_backfill(user_id, connection_id)
        .await
    {
        tracing::warn!(connection_id = %connection_id, error = ?e, "attended backfill after consent failed");
    }

    let connection = connector_service
        .get_connection(user_id, connection_id)
        .await?;

    Ok(Json(CompleteOAuthSessionResponseViewModel {
        status: OAuthSessionStatus::Completed,
        connection: connection.into(),
    }))
}

/// List Provider Accounts
///
/// Lists available provider accounts for a connection.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/connectors/connections/{connection_id}/accounts",
    tag = "Connectors",
    responses(
        (status = 200, description = "Provider accounts retrieved successfully.", body = ListProviderAccountsResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("connection_id" = Uuid, Path, description = "Id of the connection to list accounts for."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, connection_id = %connection_id))]
pub async fn list_provider_accounts(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConnectionIdPath { connection_id }): Path<ConnectionIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
) -> Result<Json<ListProviderAccountsResponseViewModel>, ApiError> {
    let accounts = connector_service
        .list_provider_accounts(user_id, connection_id)
        .await
        .map_err(ApiError::from_anyhow)?;

    Ok(Json(ListProviderAccountsResponseViewModel {
        accounts: accounts.into_iter().map(Into::into).collect(),
    }))
}

/// Create Binding
///
/// Creates a new binding between a connection and a provider account.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/connectors/connections/{connection_id}/bindings",
    tag = "Connectors",
    responses(
        (status = 201, description = "Binding created successfully.", body = CreateBindingResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("connection_id" = Uuid, Path, description = "Id of the connection to bind."),
    ),
    request_body(
        content = CreateBindingRequestViewModel,
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn create_binding(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(ConnectionIdPath { connection_id }): Path<ConnectionIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
    ValidatedJson(body): ValidatedJson<CreateBindingRequestViewModel>,
) -> Result<Json<CreateBindingResponseViewModel>, ApiError> {
    let binding_id = connector_service
        .create_binding(
            connection_id,
            user_id,
            body.sverto_account_id,
            body.provider_account_id,
            "ghost".to_string(),
        )
        .await
        .map_err(ApiError::from_anyhow)?;

    Ok(Json(CreateBindingResponseViewModel { binding_id }))
}

/// List Bindings
///
/// Gets all bindings associated with the user.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/connectors/bindings",
    tag = "Connectors",
    responses(
        (status = 200, description = "Bindings retrieved successfully.", body = GetBindingsResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn list_bindings(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    ConnectorServiceState(connector_service): ConnectorServiceState,
) -> Result<Json<GetBindingsResponseViewModel>, ApiError> {
    let bindings = connector_service.list_bindings(user_id).await?;

    Ok(Json(GetBindingsResponseViewModel {
        bindings: bindings.into_iter().map(Into::into).collect(),
    }))
}

/// Get Binding
///
/// Gets a specific binding by ID.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/connectors/bindings/{binding_id}",
    tag = "Connectors",
    responses(
        (status = 200, description = "Binding retrieved successfully.", body = ConnectorBindingViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("binding_id" = Uuid, Path, description = "Id of the binding to retrieve."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
pub async fn get_binding(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(BindingIdPath { binding_id }): Path<BindingIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
) -> Result<Json<ConnectorBindingViewModel>, ApiError> {
    let binding = connector_service.get_binding(user_id, binding_id).await?;

    Ok(Json(binding.into()))
}

/// Get Sync Checkpoint
///
/// Reads the resumable sync checkpoint (cursor + last committed sync time) for a binding.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/connectors/bindings/{binding_id}/sync-checkpoint",
    tag = "Connectors",
    responses(
        (status = 200, description = "Checkpoint retrieved successfully.", body = GetSyncCheckpointResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("binding_id" = Uuid, Path, description = "Id of the binding to read the checkpoint for."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
pub async fn get_sync_checkpoint(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(BindingIdPath { binding_id }): Path<BindingIdPath>,
    ConnectorSyncServiceState(sync_service): ConnectorSyncServiceState,
) -> Result<Json<GetSyncCheckpointResponseViewModel>, ApiError> {
    let (cursor, synced_through) = sync_service
        .get_sync_checkpoint(user_id, binding_id)
        .await?;

    Ok(Json(GetSyncCheckpointResponseViewModel {
        cursor,
        synced_through,
    }))
}

/// Update Binding
///
/// Updates a binding's write mode and status.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/connectors/bindings/{binding_id}",
    tag = "Connectors",
    responses(
        (status = 200, description = "Binding updated successfully.", body = ConnectorBindingViewModel),
        UpdateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("binding_id" = Uuid, Path, description = "Id of the binding to update."),
    ),
    request_body(
        content = UpdateBindingRequestViewModel,
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
pub async fn update_binding(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(BindingIdPath { binding_id }): Path<BindingIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
    ValidatedJson(body): ValidatedJson<UpdateBindingRequestViewModel>,
) -> Result<Json<ConnectorBindingViewModel>, ApiError> {
    connector_service
        .update_binding(
            user_id,
            binding_id,
            body.write_mode.to_business(),
            body.status.to_business(),
        )
        .await?;

    let binding = connector_service.get_binding(user_id, binding_id).await?;

    Ok(Json(binding.into()))
}

/// Delete Binding
///
/// Deletes a binding.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/connectors/bindings/{binding_id}",
    tag = "Connectors",
    responses(
        (status = 200, description = "Binding deleted successfully."),
        DeleteResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("binding_id" = Uuid, Path, description = "Id of the binding to delete."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
pub async fn delete_binding(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(BindingIdPath { binding_id }): Path<BindingIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
) -> Result<(), ApiError> {
    connector_service
        .delete_binding(user_id, binding_id)
        .await?;
    Ok(())
}

/// Sync Binding
///
/// Triggers a sync for a binding. Stored mode enqueues a job, transient mode is synchronous.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/connectors/bindings/{binding_id}/sync",
    tag = "Connectors",
    responses(
        (status = 200, description = "Sync completed successfully.", body = SyncBindingResponseViewModel),
        (status = 202, description = "Sync job enqueued."),
        (status = 502, description = "Provider fetch failed during synchronous sync."),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("binding_id" = Uuid, Path, description = "Id of the binding to sync."),
    ),
    request_body(
        content = SyncBindingRequestViewModel,
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
pub async fn sync_binding(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(BindingIdPath { binding_id }): Path<BindingIdPath>,
    ConnectorSyncServiceState(sync_service): ConnectorSyncServiceState,
    ValidatedJson(body): ValidatedJson<SyncBindingRequestViewModel>,
) -> Result<(StatusCode, Json<SyncBindingResponseViewModel>), ApiError> {
    let dispatch = sync_service
        .dispatch_sync(user_id, binding_id, body.credential.clone())
        .await
        .map_err(ApiError::from_anyhow)?;

    let (status_code, status, pages_fetched, report) = match dispatch {
        SyncDispatchDto::Queued => (StatusCode::ACCEPTED, "queued", None, None),
        SyncDispatchDto::Completed { report } => {
            (StatusCode::OK, "synced", None, Some(report.into()))
        }
        SyncDispatchDto::Partial { pages_fetched } => {
            (StatusCode::OK, "partial", Some(pages_fetched), None)
        }
    };

    Ok((
        status_code,
        Json(SyncBindingResponseViewModel {
            binding_id,
            status: status.to_string(),
            pages_fetched,
            report,
        }),
    ))
}

/// Ingest Transactions
///
/// Ingests client-supplied raw provider data for a ClientSupplied-mode binding.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/connectors/bindings/{binding_id}/ingest",
    tag = "Connectors",
    responses(
        (status = 200, description = "Data ingested successfully.", body = IngestTransactionsResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("binding_id" = Uuid, Path, description = "Id of the binding to ingest data for."),
    ),
    request_body(
        content = IngestTransactionsRequestViewModel,
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id, binding_id = %binding_id))]
pub async fn ingest_transactions(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(BindingIdPath { binding_id }): Path<BindingIdPath>,
    ConnectorServiceState(connector_service): ConnectorServiceState,
    ConnectorSyncServiceState(sync_service): ConnectorSyncServiceState,
    ValidatedJson(body): ValidatedJson<IngestTransactionsRequestViewModel>,
) -> Result<Json<IngestTransactionsResponseViewModel>, ApiError> {
    let binding = connector_service.get_binding(user_id, binding_id).await?;
    let connection = connector_service
        .get_connection(user_id, binding.connection_id)
        .await?;

    if connection.credential_mode != CredentialModeDto::ClientSupplied {
        return Err(ApiError::BadRequest(
            "binding's connection is not in client_supplied credential mode".to_string(),
        ));
    }

    let outcome = sync_service
        .sync_binding_transient(
            user_id,
            binding_id,
            TransientSyncCredentialDto::ClientSupplied {
                streams: body
                    .streams
                    .into_iter()
                    .map(|s| ClientSuppliedStreamDto {
                        stream: s.stream,
                        items: s.items,
                    })
                    .collect(),
                raw_balance: body.raw_balance,
            },
        )
        .await?;

    match outcome {
        SyncOutcomeDto::Complete { report } => Ok(Json(IngestTransactionsResponseViewModel {
            next_cursor: None,
            report: Some(report.into()),
        })),
        SyncOutcomeDto::Partial { next_cursor, .. } => {
            Ok(Json(IngestTransactionsResponseViewModel {
                next_cursor,
                report: None,
            }))
        }
        SyncOutcomeDto::Failed { error } => Err(ApiError::BadRequest(error)),
    }
}
