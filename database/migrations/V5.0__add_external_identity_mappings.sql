CREATE TABLE IF NOT EXISTS external_identity_mappings (
    id SERIAL NOT NULL,
    provider TEXT NOT NULL,
    external_user_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT external_identity_mappings_pk PRIMARY KEY (id),
    CONSTRAINT external_identity_mappings_provider_external_id_key UNIQUE (provider, external_user_id),
    CONSTRAINT external_identity_mappings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
