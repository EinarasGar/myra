use dal::models::connector_models::{ActiveStoredBindingRow, ConnectorBindingRow};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BindingWriteModeDto {
    Ghost,
    Trusted,
}

impl BindingWriteModeDto {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ghost => "ghost",
            Self::Trusted => "trusted",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BindingUpdateStatusDto {
    Active,
    Paused,
}

impl BindingUpdateStatusDto {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Paused => "paused",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BindingStatusDto {
    Pending,
    Active,
    Paused,
    Error,
    Revoked,
}

impl BindingStatusDto {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Error => "error",
            Self::Revoked => "revoked",
        }
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "active" => Some(Self::Active),
            "paused" => Some(Self::Paused),
            "error" => Some(Self::Error),
            "revoked" => Some(Self::Revoked),
            _ => None,
        }
    }
}

pub struct ActiveStoredBinding {
    pub binding_id: Uuid,
    pub user_id: Uuid,
}

impl From<ActiveStoredBindingRow> for ActiveStoredBinding {
    fn from(row: ActiveStoredBindingRow) -> Self {
        Self {
            binding_id: row.id,
            user_id: row.user_id,
        }
    }
}

pub struct ConnectorBindingDto {
    pub id: Uuid,
    pub provider_account_ref: Uuid,
    pub connection_id: Uuid,
    pub sverto_account_id: Uuid,
    pub provider_account_id: String,
    pub write_mode: String,
    pub status: BindingStatusDto,
    pub synced_through: Option<OffsetDateTime>,
    pub last_sync_at: Option<OffsetDateTime>,
    pub last_sync_status: Option<String>,
    pub last_sync_error: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

impl From<ConnectorBindingRow> for ConnectorBindingDto {
    fn from(row: ConnectorBindingRow) -> Self {
        Self {
            id: row.id,
            provider_account_ref: row.provider_account_ref,
            connection_id: row.connection_id,
            sverto_account_id: row.sverto_account_id,
            provider_account_id: row.provider_account_id,
            write_mode: row.write_mode,
            status: BindingStatusDto::from_db_str(&row.status).unwrap_or(BindingStatusDto::Error),
            synced_through: row.synced_through,
            last_sync_at: row.last_sync_at,
            last_sync_status: row.last_sync_status,
            last_sync_error: row.last_sync_error,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}
