#[cfg(feature = "backend")]
use business::dtos::connectors::CredentialModeDto;
#[cfg(feature = "backend")]
use business::dtos::connectors::{ConnectorBindingDto, ConnectorConnectionDto};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CredentialMode {
    Stored,
    Transient,
    ClientSupplied,
}

#[cfg(feature = "backend")]
impl From<CredentialModeDto> for CredentialMode {
    fn from(mode: CredentialModeDto) -> Self {
        match mode {
            CredentialModeDto::Stored => Self::Stored,
            CredentialModeDto::Transient => Self::Transient,
            CredentialModeDto::ClientSupplied => Self::ClientSupplied,
        }
    }
}

#[cfg(feature = "backend")]
impl CredentialMode {
    pub fn to_business(self) -> CredentialModeDto {
        match self {
            Self::Stored => CredentialModeDto::Stored,
            Self::Transient => CredentialModeDto::Transient,
            Self::ClientSupplied => CredentialModeDto::ClientSupplied,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ConnectorConnectionViewModel {
    pub id: uuid::Uuid,
    pub provider_kind: String,
    pub credential_mode: CredentialMode,
    pub provider_key_id: Option<String>,
    pub status: String,
    pub consent_expires_at: Option<time::OffsetDateTime>,
    pub created_at: time::OffsetDateTime,
    pub updated_at: time::OffsetDateTime,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ConnectorBindingViewModel {
    pub id: uuid::Uuid,
    pub connection_id: uuid::Uuid,
    pub sverto_account_id: uuid::Uuid,
    pub provider_account_id: String,
    pub write_mode: String,
    pub status: String,
    pub synced_through: Option<time::OffsetDateTime>,
    pub last_sync_at: Option<time::OffsetDateTime>,
    pub last_sync_status: Option<String>,
    pub last_sync_error: Option<String>,
    pub created_at: time::OffsetDateTime,
    pub updated_at: time::OffsetDateTime,
}

#[cfg(feature = "backend")]
impl From<ConnectorConnectionDto> for ConnectorConnectionViewModel {
    fn from(dto: ConnectorConnectionDto) -> Self {
        Self {
            id: dto.id,
            provider_kind: dto.provider_kind,
            credential_mode: dto.credential_mode.into(),
            provider_key_id: dto.provider_key_id,
            status: dto.status.as_str().to_string(),
            consent_expires_at: dto.consent_expires_at,
            created_at: dto.created_at,
            updated_at: dto.updated_at,
        }
    }
}

#[cfg(feature = "backend")]
impl From<ConnectorBindingDto> for ConnectorBindingViewModel {
    fn from(dto: ConnectorBindingDto) -> Self {
        Self {
            id: dto.id,
            connection_id: dto.connection_id,
            sverto_account_id: dto.sverto_account_id,
            provider_account_id: dto.provider_account_id,
            write_mode: dto.write_mode,
            status: dto.status.as_str().to_string(),
            synced_through: dto.synced_through,
            last_sync_at: dto.last_sync_at,
            last_sync_status: dto.last_sync_status,
            last_sync_error: dto.last_sync_error,
            created_at: dto.created_at,
            updated_at: dto.updated_at,
        }
    }
}
