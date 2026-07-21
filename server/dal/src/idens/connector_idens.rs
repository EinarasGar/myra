use sea_query::Iden;

#[allow(dead_code)]
pub enum ConnectorProviderIden {
    Table,
    Id,
    Kind,
    DisplayName,
}

impl Iden for ConnectorProviderIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "connector_provider",
            Self::Id => "id",
            Self::Kind => "kind",
            Self::DisplayName => "display_name",
        }
    }
}

#[allow(dead_code)]
pub enum ConnectorConnectionIden {
    Table,
    Id,
    UserId,
    ProviderId,
    CredentialMode,
    ProviderKeyId,
    Status,
    ConsentExpiresAt,
    CreatedAt,
    UpdatedAt,
}

impl Iden for ConnectorConnectionIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "connector_connection",
            Self::Id => "id",
            Self::UserId => "user_id",
            Self::ProviderId => "provider_id",
            Self::CredentialMode => "credential_mode",
            Self::ProviderKeyId => "provider_key_id",
            Self::Status => "status",
            Self::ConsentExpiresAt => "consent_expires_at",
            Self::CreatedAt => "created_at",
            Self::UpdatedAt => "updated_at",
        }
    }
}

#[allow(dead_code)]
pub enum ConnectorProviderAccountIden {
    Table,
    Id,
    ConnectionId,
    ExternalAccountId,
    SyncedThrough,
    SyncClaimedAt,
    LastSyncAt,
    LastSyncStatus,
    LastSyncError,
    CreatedAt,
    UpdatedAt,
}

impl Iden for ConnectorProviderAccountIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "connector_provider_account",
            Self::Id => "id",
            Self::ConnectionId => "connection_id",
            Self::ExternalAccountId => "external_account_id",
            Self::SyncedThrough => "synced_through",
            Self::SyncClaimedAt => "sync_claimed_at",
            Self::LastSyncAt => "last_sync_at",
            Self::LastSyncStatus => "last_sync_status",
            Self::LastSyncError => "last_sync_error",
            Self::CreatedAt => "created_at",
            Self::UpdatedAt => "updated_at",
        }
    }
}

#[allow(dead_code)]
pub enum ConnectorBindingIden {
    Table,
    Id,
    ProviderAccountId,
    SvertoAccountId,
    WriteMode,
    Status,
    ProjectedPageId,
    CreatedAt,
    UpdatedAt,
}

impl Iden for ConnectorBindingIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "connector_binding",
            Self::Id => "id",
            Self::ProviderAccountId => "provider_account_id",
            Self::SvertoAccountId => "sverto_account_id",
            Self::WriteMode => "write_mode",
            Self::Status => "status",
            Self::ProjectedPageId => "projected_page_id",
            Self::CreatedAt => "created_at",
            Self::UpdatedAt => "updated_at",
        }
    }
}

#[allow(dead_code)]
pub enum ConnectorTransactionIden {
    Table,
    Id,
    BindingId,
    TransactionId,
    ExternalId,
    ExternalHash,
    EditedByUser,
    ImportedAt,
}

impl Iden for ConnectorTransactionIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "connector_transaction",
            Self::Id => "id",
            Self::BindingId => "binding_id",
            Self::TransactionId => "transaction_id",
            Self::ExternalId => "external_id",
            Self::ExternalHash => "external_hash",
            Self::EditedByUser => "edited_by_user",
            Self::ImportedAt => "imported_at",
        }
    }
}

#[allow(dead_code)]
#[allow(dead_code)]
pub enum ConnectorRawPageIden {
    Table,
    Id,
    ProviderAccountId,
    Stream,
    Payload,
    CursorAfter,
    PayloadHash,
    FetchedAt,
}

impl Iden for ConnectorRawPageIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "connector_raw_page",
            Self::Id => "id",
            Self::ProviderAccountId => "provider_account_id",
            Self::Stream => "stream",
            Self::Payload => "payload",
            Self::CursorAfter => "cursor_after",
            Self::PayloadHash => "payload_hash",
            Self::FetchedAt => "fetched_at",
        }
    }
}

#[allow(dead_code)]
pub enum ConnectorSecretIden {
    Table,
    Key,
    Ciphertext,
    Nonce,
    CreatedAt,
}

impl Iden for ConnectorSecretIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "connector_secret",
            Self::Key => "key",
            Self::Ciphertext => "ciphertext",
            Self::Nonce => "nonce",
            Self::CreatedAt => "created_at",
        }
    }
}
