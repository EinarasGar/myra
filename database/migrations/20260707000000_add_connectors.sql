CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE connector_provider (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    kind TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    CONSTRAINT connector_provider_pk PRIMARY KEY (id)
);

CREATE TABLE connector_connection (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES connector_provider(id),
    credential_mode TEXT NOT NULL CHECK (credential_mode IN ('stored', 'transient', 'client_supplied')),
    provider_key_id TEXT,
    status TEXT DEFAULT 'pending_oauth' NOT NULL CHECK (status IN ('pending_oauth', 'active', 'paused', 'error', 'revoked')),
    consent_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT connector_connection_pk PRIMARY KEY (id)
);
CREATE INDEX idx_connector_connection_user_id ON connector_connection(user_id);

CREATE TABLE connector_provider_account (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    connection_id UUID NOT NULL REFERENCES connector_connection(id) ON DELETE CASCADE,
    external_account_id TEXT NOT NULL,
    synced_through TIMESTAMPTZ,
    sync_claimed_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IS NULL OR last_sync_status IN ('ok', 'partial', 'failed')),
    last_sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT connector_provider_account_pk PRIMARY KEY (id),
    CONSTRAINT connector_provider_account_conn_ext_key UNIQUE (connection_id, external_account_id)
);
CREATE INDEX idx_connector_provider_account_connection ON connector_provider_account(connection_id);

CREATE TABLE connector_binding (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    provider_account_id UUID NOT NULL REFERENCES connector_provider_account(id) ON DELETE CASCADE,
    sverto_account_id UUID NOT NULL REFERENCES account,
    write_mode TEXT DEFAULT 'ghost' NOT NULL CHECK (write_mode IN ('ghost', 'trusted')),
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'paused', 'error', 'revoked')),
    projected_page_id UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT connector_binding_pk PRIMARY KEY (id),
    CONSTRAINT connector_binding_pa_account_key UNIQUE (provider_account_id, sverto_account_id)
);
CREATE INDEX idx_connector_binding_provider_account ON connector_binding(provider_account_id);

ALTER TABLE transaction
    ADD COLUMN visibility TEXT DEFAULT 'default' NOT NULL CHECK (visibility IN ('default', 'ghost', 'hidden'));

CREATE TABLE connector_transaction (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    binding_id UUID NOT NULL REFERENCES connector_binding(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transaction(id) ON DELETE SET NULL,
    external_id TEXT NOT NULL,
    external_hash TEXT NOT NULL,
    edited_by_user BOOLEAN DEFAULT false NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT connector_transaction_pk PRIMARY KEY (id),
    CONSTRAINT connector_transaction_binding_ext_key UNIQUE (binding_id, external_id)
);
CREATE INDEX idx_connector_transaction_binding_id ON connector_transaction(binding_id);

CREATE TABLE connector_raw_page (
    id UUID DEFAULT uuidv7() NOT NULL,
    provider_account_id UUID NOT NULL REFERENCES connector_provider_account(id) ON DELETE CASCADE,
    stream TEXT NOT NULL,
    payload JSONB NOT NULL,
    cursor_after JSONB,
    payload_hash TEXT NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT connector_raw_page_pk PRIMARY KEY (id)
);
CREATE INDEX idx_connector_raw_page_pa_stream ON connector_raw_page(provider_account_id, stream, fetched_at);
CREATE INDEX idx_connector_raw_page_pa_id ON connector_raw_page(provider_account_id, id);

CREATE TABLE secrets (
    key TEXT PRIMARY KEY,
    ciphertext BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO connector_provider (kind, display_name) VALUES
    ('trading212', 'Trading 212'),
    ('truelayer', 'TrueLayer')
ON CONFLICT (kind) DO NOTHING;
