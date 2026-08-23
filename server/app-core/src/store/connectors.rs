use std::collections::HashMap;

use shared::view_models::connectors::base_models::CredentialMode as VmCredentialMode;
use shared::view_models::connectors::create_binding::CreateBindingRequestViewModel;
use shared::view_models::connectors::create_connection::CreateConnectionRequestViewModel;
use shared::view_models::connectors::oauth::{
    CompleteOAuthSessionRequestViewModel, CreateOAuthSessionRequestViewModel,
};
use shared::view_models::connectors::sync_binding::SyncBindingRequestViewModel;
use shared::view_models::connectors::update_binding::{
    BindingUpdateStatus, UpdateBindingRequestViewModel,
};

use super::connector_local;
use super::infra::SharedInfra;
use crate::api::connectors::*;
use crate::error::{server_error, ApiError};
use crate::models::{
    BindingStatus, BindingWriteMode, CompleteOAuthResult, ConnectorBinding, ConnectorConnection,
    CreateConnectionInput, CredentialMode, OAuthSessionStart, ProviderAccount,
    ProviderAccountTransaction, SyncOutcome,
};

fn user_id(infra: &SharedInfra) -> Result<String, ApiError> {
    infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })
}

fn ok_or_err(status: u16, body: &str) -> Result<(), ApiError> {
    if status >= 400 {
        return Err(server_error(status, body));
    }
    Ok(())
}

fn evict_connectors(infra: &SharedInfra, uid: &str) {
    infra.evict_memory_cache_prefix(&format!("/api/users/{uid}/connectors"));
}

async fn account_names(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<HashMap<String, String>, ApiError> {
    let uid = user_id(infra)?;
    let resp = infra
        .get(&format!("/api/users/{uid}/accounts"), auth_token)
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    let accounts = crate::api::accounts::extract_accounts(&resp.body)
        .map_err(|e| ApiError::Parse { reason: e })?;
    Ok(accounts.into_iter().map(|a| (a.id, a.name)).collect())
}

pub async fn list_connections(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<Vec<ConnectorConnection>, ApiError> {
    let uid = user_id(infra)?;
    let resp = infra
        .get(
            &format!("/api/users/{uid}/connectors/connections"),
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    extract_connections(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn create_connection(
    infra: &SharedInfra,
    input: CreateConnectionInput,
    auth_token: Option<&str>,
) -> Result<String, ApiError> {
    let uid = user_id(infra)?;
    let mode = match input.credential_mode {
        CredentialMode::Stored => VmCredentialMode::Stored,
        CredentialMode::Transient => VmCredentialMode::Transient,
        CredentialMode::ClientSupplied => VmCredentialMode::ClientSupplied,
    };
    let body = serde_json::to_string(&CreateConnectionRequestViewModel {
        provider_kind: input.provider_kind,
        credential_mode: mode,
        credential: input.credential,
        provider_key_id: input.provider_key_id,
    })
    .map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })?;
    let resp = infra
        .post(
            &format!("/api/users/{uid}/connectors/connections"),
            &body,
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    evict_connectors(infra, &uid);
    extract_connection_id(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn revoke_connection(
    infra: &SharedInfra,
    connection_id: &str,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let uid = user_id(infra)?;
    let resp = infra
        .delete(
            &format!("/api/users/{uid}/connectors/connections/{connection_id}"),
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    connector_local::delete_credential(infra, connection_id);
    evict_connectors(infra, &uid);
    Ok(())
}

pub async fn create_oauth_session(
    infra: &SharedInfra,
    connection_id: &str,
    auth_token: Option<&str>,
) -> Result<OAuthSessionStart, ApiError> {
    let uid = user_id(infra)?;
    let redirect_uri = format!(
        "{}/connectors/truelayer/callback",
        infra.base_url().trim_end_matches('/')
    );
    let body = serde_json::to_string(&CreateOAuthSessionRequestViewModel {
        redirect_uri: Some(redirect_uri),
    })
    .map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })?;
    let resp = infra
        .post(
            &format!("/api/users/{uid}/connectors/connections/{connection_id}/oauth/sessions"),
            &body,
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    let session = extract_oauth_session(&resp.body).map_err(|e| ApiError::Parse { reason: e })?;
    connector_local::save_pending_oauth(infra, connection_id, &session.session_id);
    Ok(session)
}

pub async fn complete_oauth_session(
    infra: &SharedInfra,
    state: &str,
    code: Option<String>,
    error: Option<String>,
    auth_token: Option<&str>,
) -> Result<CompleteOAuthResult, ApiError> {
    let uid = user_id(infra)?;
    let pending = connector_local::get_pending_oauth(infra).ok_or(ApiError::Parse {
        reason: "no pending OAuth session on this device".into(),
    })?;
    let body = serde_json::to_string(&CompleteOAuthSessionRequestViewModel {
        state: state.to_string(),
        code,
        error,
        error_description: None,
    })
    .map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })?;
    let resp = infra
        .put(
            &format!(
                "/api/users/{uid}/connectors/connections/{}/oauth/sessions/{}",
                pending.connection_id, pending.session_id
            ),
            &body,
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    let result = extract_complete_oauth(&resp.body).map_err(|e| ApiError::Parse { reason: e })?;
    connector_local::clear_pending_oauth(infra);
    evict_connectors(infra, &uid);
    infra.evict_memory_cache_prefix(&format!("/api/users/{uid}/transactions"));
    infra.evict_memory_cache_prefix(&format!("/api/users/{uid}/accounts"));
    Ok(result)
}

pub async fn list_provider_accounts(
    infra: &SharedInfra,
    connection_id: &str,
    auth_token: Option<&str>,
) -> Result<Vec<ProviderAccount>, ApiError> {
    let uid = user_id(infra)?;
    let resp = infra
        .get(
            &format!("/api/users/{uid}/connectors/connections/{connection_id}/accounts"),
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    extract_provider_accounts(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn list_provider_account_transactions(
    infra: &SharedInfra,
    connection_id: &str,
    provider_account_id: &str,
    auth_token: Option<&str>,
) -> Result<Vec<ProviderAccountTransaction>, ApiError> {
    let uid = user_id(infra)?;
    let resp = infra
        .get(
            &format!(
                "/api/users/{uid}/connectors/connections/{connection_id}/accounts/{provider_account_id}/transactions"
            ),
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    extract_provider_account_transactions(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn list_bindings(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<Vec<ConnectorBinding>, ApiError> {
    let uid = user_id(infra)?;
    let names = account_names(infra, auth_token).await?;
    let resp = infra
        .get(&format!("/api/users/{uid}/connectors/bindings"), auth_token)
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    extract_bindings(&resp.body, &names).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn create_binding(
    infra: &SharedInfra,
    connection_id: &str,
    sverto_account_id: &str,
    provider_account_id: Option<String>,
    auth_token: Option<&str>,
) -> Result<String, ApiError> {
    let uid = user_id(infra)?;
    let account_uuid = sverto_account_id.parse().map_err(|_| ApiError::Parse {
        reason: "invalid account id".into(),
    })?;
    let body = serde_json::to_string(&CreateBindingRequestViewModel {
        sverto_account_id: account_uuid,
        provider_account_id,
    })
    .map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })?;
    let resp = infra
        .post(
            &format!("/api/users/{uid}/connectors/connections/{connection_id}/bindings"),
            &body,
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    evict_connectors(infra, &uid);
    extract_binding_id(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn update_binding(
    infra: &SharedInfra,
    binding_id: &str,
    write_mode: BindingWriteMode,
    status: BindingStatus,
    auth_token: Option<&str>,
) -> Result<ConnectorBinding, ApiError> {
    let uid = user_id(infra)?;
    let names = account_names(infra, auth_token).await?;
    let body = serde_json::to_string(&UpdateBindingRequestViewModel {
        write_mode: crate::api::connectors::write_mode_to_vm(write_mode),
        status: match status {
            BindingStatus::Active => BindingUpdateStatus::Active,
            BindingStatus::Paused => BindingUpdateStatus::Paused,
        },
    })
    .map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })?;
    let resp = infra
        .put(
            &format!("/api/users/{uid}/connectors/bindings/{binding_id}"),
            &body,
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    evict_connectors(infra, &uid);
    extract_single_binding(&resp.body, &names).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn delete_binding(
    infra: &SharedInfra,
    binding_id: &str,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let uid = user_id(infra)?;
    let resp = infra
        .delete(
            &format!("/api/users/{uid}/connectors/bindings/{binding_id}"),
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    evict_connectors(infra, &uid);
    Ok(())
}

pub async fn sync_binding(
    infra: &SharedInfra,
    binding_id: &str,
    connection_id: &str,
    credential_mode: CredentialMode,
    auth_token: Option<&str>,
) -> Result<SyncOutcome, ApiError> {
    let uid = user_id(infra)?;
    let credential = match credential_mode {
        CredentialMode::Transient => Some(
            connector_local::get_credential(infra, connection_id)
                .ok_or(ApiError::MissingLocalCredential)?,
        ),
        _ => None,
    };
    let body = serde_json::to_string(&SyncBindingRequestViewModel { credential }).map_err(|e| {
        ApiError::Parse {
            reason: e.to_string(),
        }
    })?;
    let resp = infra
        .post(
            &format!("/api/users/{uid}/connectors/bindings/{binding_id}/sync"),
            &body,
            auth_token,
        )
        .await?;
    ok_or_err(resp.status, &resp.body)?;
    evict_connectors(infra, &uid);
    infra.evict_memory_cache_prefix(&format!("/api/users/{uid}/transactions"));
    infra.evict_memory_cache_prefix(&format!("/api/users/{uid}/accounts"));
    extract_sync_outcome(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}
