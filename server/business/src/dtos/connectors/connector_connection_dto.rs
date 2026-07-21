use dal::models::connector_models::ConnectorConnectionRow;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CredentialModeDto {
    Stored,
    Transient,
    ClientSupplied,
}

impl CredentialModeDto {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Stored => "stored",
            Self::Transient => "transient",
            Self::ClientSupplied => "client_supplied",
        }
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s {
            "stored" => Some(Self::Stored),
            "transient" => Some(Self::Transient),
            "client_supplied" => Some(Self::ClientSupplied),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConnectionStatusDto {
    PendingOauth,
    Active,
    Paused,
    Error,
    Revoked,
}

impl ConnectionStatusDto {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PendingOauth => "pending_oauth",
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Error => "error",
            Self::Revoked => "revoked",
        }
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s {
            "pending_oauth" => Some(Self::PendingOauth),
            "active" => Some(Self::Active),
            "paused" => Some(Self::Paused),
            "error" => Some(Self::Error),
            "revoked" => Some(Self::Revoked),
            _ => None,
        }
    }
}

pub struct ConnectorConnectionDto {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider_kind: String,
    pub credential_mode: CredentialModeDto,
    pub provider_key_id: Option<String>,
    pub status: ConnectionStatusDto,
    pub consent_expires_at: Option<OffsetDateTime>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

impl From<ConnectorConnectionRow> for ConnectorConnectionDto {
    fn from(row: ConnectorConnectionRow) -> Self {
        Self {
            id: row.id,
            user_id: row.user_id,
            provider_kind: row.provider_kind,
            credential_mode: CredentialModeDto::from_db_str(&row.credential_mode)
                .unwrap_or(CredentialModeDto::Stored),
            provider_key_id: row.provider_key_id,
            status: ConnectionStatusDto::from_db_str(&row.status)
                .unwrap_or(ConnectionStatusDto::Error),
            consent_expires_at: row.consent_expires_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}
