use rust_decimal::prelude::ToPrimitive;
use shared::view_models::connectors::base_models::{
    ConnectorBindingViewModel, ConnectorConnectionViewModel, CredentialMode,
};
use shared::view_models::connectors::create_binding::CreateBindingResponseViewModel;
use shared::view_models::connectors::create_connection::CreateConnectionResponseViewModel;
use shared::view_models::connectors::get_bindings::GetBindingsResponseViewModel;
use shared::view_models::connectors::get_connections::GetConnectionsResponseViewModel;
use shared::view_models::connectors::list_provider_account_transactions::ListProviderAccountTransactionsResponseViewModel;
use shared::view_models::connectors::list_provider_accounts::ListProviderAccountsResponseViewModel;
use shared::view_models::connectors::oauth::{
    CompleteOAuthSessionResponseViewModel, CreateOAuthSessionResponseViewModel, OAuthSessionStatus,
};
use shared::view_models::connectors::sync_binding::SyncBindingResponseViewModel;
use shared::view_models::connectors::update_binding::BindingWriteMode as VmWriteMode;

use crate::models::{
    BindingWriteMode, CompleteOAuthResult, ConnectorBinding, ConnectorConnection,
    CredentialMode as AppCredentialMode, OAuthCompletionStatus, OAuthSessionStart, ProviderAccount,
    ProviderAccountTransaction, SyncOutcome, SyncReport,
};

fn mode_from(vm: CredentialMode) -> AppCredentialMode {
    match vm {
        CredentialMode::Stored => AppCredentialMode::Stored,
        CredentialMode::Transient => AppCredentialMode::Transient,
        CredentialMode::ClientSupplied => AppCredentialMode::ClientSupplied,
    }
}

pub fn connection_from(vm: ConnectorConnectionViewModel) -> ConnectorConnection {
    ConnectorConnection {
        id: vm.id.to_string(),
        provider_kind: vm.provider_kind,
        credential_mode: mode_from(vm.credential_mode),
        provider_key_id: vm.provider_key_id,
        status: vm.status,
        consent_expires_at: vm.consent_expires_at.map(|t| t.unix_timestamp()),
        created_at: vm.created_at.unix_timestamp(),
    }
}

fn binding_from(vm: ConnectorBindingViewModel, account_name: String) -> ConnectorBinding {
    ConnectorBinding {
        id: vm.id.to_string(),
        connection_id: vm.connection_id.to_string(),
        sverto_account_id: vm.sverto_account_id.to_string(),
        sverto_account_name: account_name,
        provider_account_id: vm.provider_account_id,
        write_mode: if vm.write_mode == "trusted" {
            BindingWriteMode::Trusted
        } else {
            BindingWriteMode::Ghost
        },
        status: vm.status,
        synced_through: vm.synced_through.map(|t| t.unix_timestamp()),
        last_sync_at: vm.last_sync_at.map(|t| t.unix_timestamp()),
        last_sync_status: vm.last_sync_status,
        last_sync_error: vm.last_sync_error,
    }
}

pub fn extract_connections(body: &str) -> Result<Vec<ConnectorConnection>, String> {
    let resp: GetConnectionsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .connections
        .into_iter()
        .filter(|c| c.status != "revoked")
        .map(connection_from)
        .collect())
}

pub fn extract_bindings(
    body: &str,
    account_names: &std::collections::HashMap<String, String>,
) -> Result<Vec<ConnectorBinding>, String> {
    let resp: GetBindingsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .bindings
        .into_iter()
        .filter(|vm| vm.status != "revoked")
        .map(|vm| {
            let name = account_names
                .get(&vm.sverto_account_id.to_string())
                .cloned()
                .unwrap_or_else(|| "Unknown account".to_string());
            binding_from(vm, name)
        })
        .collect())
}

pub fn extract_single_binding(
    body: &str,
    account_names: &std::collections::HashMap<String, String>,
) -> Result<ConnectorBinding, String> {
    let vm: ConnectorBindingViewModel = serde_json::from_str(body).map_err(|e| e.to_string())?;
    let name = account_names
        .get(&vm.sverto_account_id.to_string())
        .cloned()
        .unwrap_or_else(|| "Unknown account".to_string());
    Ok(binding_from(vm, name))
}

pub fn extract_connection_id(body: &str) -> Result<String, String> {
    let resp: CreateConnectionResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp.connection_id.to_string())
}

pub fn extract_binding_id(body: &str) -> Result<String, String> {
    let resp: CreateBindingResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp.binding_id.to_string())
}

pub fn extract_oauth_session(body: &str) -> Result<OAuthSessionStart, String> {
    let resp: CreateOAuthSessionResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(OAuthSessionStart {
        session_id: resp.session_id,
        auth_url: resp.auth_url,
        state: resp.state,
    })
}

pub fn extract_complete_oauth(body: &str) -> Result<CompleteOAuthResult, String> {
    let resp: CompleteOAuthSessionResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(CompleteOAuthResult {
        status: match resp.status {
            OAuthSessionStatus::Completed => OAuthCompletionStatus::Completed,
            OAuthSessionStatus::Denied => OAuthCompletionStatus::Denied,
        },
        connection: connection_from(resp.connection),
    })
}

pub fn extract_provider_accounts(body: &str) -> Result<Vec<ProviderAccount>, String> {
    let resp: ListProviderAccountsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .accounts
        .into_iter()
        .map(|a| ProviderAccount {
            provider_account_id: a.provider_account_id,
            display_name: a.display_name,
            currency: a.currency,
            account_type: a.account_type,
        })
        .collect())
}

pub fn extract_provider_account_transactions(
    body: &str,
) -> Result<Vec<ProviderAccountTransaction>, String> {
    let resp: ListProviderAccountTransactionsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .transactions
        .into_iter()
        .map(|t| ProviderAccountTransaction {
            date: t.date.unix_timestamp(),
            description: t.description,
            amount: t.amount.to_f64().unwrap_or(0.0),
            currency: t.currency,
            asset_identifier: t.asset_identifier,
            quantity: t.quantity.and_then(|q| q.to_f64()),
        })
        .collect())
}

pub fn extract_sync_outcome(body: &str) -> Result<SyncOutcome, String> {
    let resp: SyncBindingResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(SyncOutcome {
        status: resp.status,
        report: resp.report.map(|r| SyncReport {
            new_transactions: r.new_transactions,
            unchanged: r.unchanged,
            amended: r.amended,
            conflicts: r.conflicts,
            unresolved: r.unresolved,
            duplicates: r.duplicates,
        }),
    })
}

pub fn write_mode_to_vm(mode: BindingWriteMode) -> VmWriteMode {
    match mode {
        BindingWriteMode::Ghost => VmWriteMode::Ghost,
        BindingWriteMode::Trusted => VmWriteMode::Trusted,
    }
}
