use sqlx::types::{Json, Uuid};
use time::OffsetDateTime;

#[derive(sqlx::FromRow, Debug)]
pub struct ConnectorConnectionRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider_id: Uuid,
    pub provider_kind: String,
    pub credential_mode: String,
    pub provider_key_id: Option<String>,
    pub status: String,
    pub consent_expires_at: Option<OffsetDateTime>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

/// through from the provider account.
#[derive(sqlx::FromRow, Debug)]
pub struct ConnectorBindingRow {
    pub id: Uuid,
    pub provider_account_ref: Uuid,
    pub connection_id: Uuid,
    pub sverto_account_id: Uuid,
    pub provider_account_id: String,
    pub write_mode: String,
    pub status: String,
    pub synced_through: Option<OffsetDateTime>,
    pub projected_page_id: Option<Uuid>,
    pub last_sync_at: Option<OffsetDateTime>,
    pub last_sync_status: Option<String>,
    pub last_sync_error: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(sqlx::FromRow, Debug)]
pub struct ConnectorTransactionRow {
    pub transaction_id: Option<Uuid>,
    pub external_id: String,
    pub external_hash: String,
    pub edited_by_user: bool,
}

#[derive(sqlx::FromRow, Debug)]
pub struct ActiveStoredBindingRow {
    pub id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug)]
pub struct AddConnectorConnectionModel {
    pub user_id: Uuid,
    pub provider_id: Uuid,
    pub credential_mode: String,
    pub provider_key_id: Option<String>,
    pub status: String,
    pub consent_expires_at: Option<OffsetDateTime>,
}

#[derive(Debug)]
pub struct AddConnectorBindingModel {
    pub provider_account_ref: Uuid,
    pub sverto_account_id: Uuid,
    pub write_mode: String,
    pub status: String,
}

#[derive(Debug)]
pub struct AddConnectorProviderAccountModel {
    pub connection_id: Uuid,
    pub external_account_id: String,
}

#[derive(Debug)]
pub struct AddConnectorTransactionModel {
    pub binding_id: Uuid,
    pub transaction_id: Option<Uuid>,
    pub external_id: String,
    pub external_hash: String,
}

/// Fetch outcome, written to the provider account after a walk. Clears `sync_claimed_at`.
#[derive(Debug)]
pub struct UpdateProviderAccountSyncResultModel {
    pub provider_account_ref: Uuid,
    pub last_sync_status: Option<String>,
    pub last_sync_error: Option<String>,
    pub last_sync_at: OffsetDateTime,
    pub synced_through: Option<OffsetDateTime>,
}

#[derive(Debug)]
pub struct AddConnectorRawPageModel {
    pub provider_account_ref: Uuid,
    pub stream: String,
    pub payload: serde_json::Value,
    pub cursor_after: Option<serde_json::Value>,
    pub payload_hash: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct ConnectorRawPageRow {
    pub id: Uuid,
    pub stream: String,
    pub payload: Json<serde_json::Value>,
}

#[derive(sqlx::FromRow, Debug)]
pub struct RawPageCursorRow {
    pub cursor_after: Option<Json<serde_json::Value>>,
}
