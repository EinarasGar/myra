-- Default per-user token limits (one row with user_id NULL)
-- Per-user overrides (rows with user_id set)
CREATE TABLE token_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE,
    hourly_input_tokens BIGINT NOT NULL,
    hourly_output_tokens BIGINT NOT NULL,
    monthly_input_tokens BIGINT NOT NULL,
    monthly_output_tokens BIGINT NOT NULL,
    CONSTRAINT unique_token_rate_limit_user UNIQUE (user_id)
);

-- Global system-wide limits (single row)
CREATE TABLE global_token_rate_limits (
    id SERIAL PRIMARY KEY,
    hourly_input_tokens BIGINT NOT NULL,
    hourly_output_tokens BIGINT NOT NULL,
    monthly_input_tokens BIGINT NOT NULL,
    monthly_output_tokens BIGINT NOT NULL
);

-- Per-user usage tracking
CREATE TABLE token_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL CHECK (window_type IN ('hourly', 'monthly')),
    window_key TEXT NOT NULL,
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT unique_token_usage UNIQUE (user_id, window_type, window_key)
);
CREATE INDEX idx_token_usage_user_window ON token_usage(user_id, window_type, window_key);

-- Global usage tracking
CREATE TABLE global_token_usage (
    id SERIAL PRIMARY KEY,
    window_type TEXT NOT NULL CHECK (window_type IN ('hourly', 'monthly')),
    window_key TEXT NOT NULL,
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT unique_global_token_usage UNIQUE (window_type, window_key)
);
CREATE INDEX idx_global_token_usage_window ON global_token_usage(window_type, window_key);

-- Seed: global default per-user limits
INSERT INTO token_rate_limits (user_id, hourly_input_tokens, hourly_output_tokens, monthly_input_tokens, monthly_output_tokens)
VALUES (NULL, 50000, 50000, 1000000, 1000000);

-- Seed: global system-wide limits (10x per-user)
INSERT INTO global_token_rate_limits (hourly_input_tokens, hourly_output_tokens, monthly_input_tokens, monthly_output_tokens)
VALUES (500000, 500000, 10000000, 10000000);
