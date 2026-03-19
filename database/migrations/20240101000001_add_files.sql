CREATE TABLE user_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(255) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    storage_key     TEXT NOT NULL,
    thumbnail_key   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_files_user_id ON user_files(user_id);
CREATE INDEX idx_user_files_status ON user_files(status);
CREATE UNIQUE INDEX idx_user_files_storage_key ON user_files(storage_key);
