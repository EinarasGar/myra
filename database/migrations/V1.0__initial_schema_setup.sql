DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS transaction_types (
    id SERIAL NOT NULL,
    transaction_type_name TEXT NOT NULL,
    CONSTRAINT transaction_types_pk PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS asset_types (
    id SERIAL NOT NULL,
    asset_type_name TEXT NOT NULL,
    CONSTRAINT asset_types_pk PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS transaction_category_type (
    id SERIAL NOT NULL,
    category_type_name TEXT NOT NULL,
    CONSTRAINT transaction_category_type_pk PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS account_types (
    id SERIAL NOT NULL,
    account_type_name TEXT NOT NULL,
    CONSTRAINT account_types_pk PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS account_liquidity_types (
    id SERIAL NOT NULL,
    liquidity_type_name TEXT NOT NULL,
    CONSTRAINT account_liquidity_types_pk PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS transaction_categories (
    id SERIAL NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    category_type INT NOT NULL,
    CONSTRAINT transaction_categories_pk PRIMARY KEY (id),
    CONSTRAINT transaction_categories_type_fkey FOREIGN KEY (category_type) REFERENCES transaction_category_type(id)
);
CREATE TABLE IF NOT EXISTS transaction_group (
    id UUID NOT NULL,
    category_id INT NOT NULL,
    description TEXT NOT NULL,
    date_added TIMESTAMPTZ NOT NULL,
    CONSTRAINT transaction_group_id_pkey PRIMARY KEY (id),
    CONSTRAINT transaction_group_category_id_fkey FOREIGN KEY (category_id) REFERENCES transaction_categories(id)
);
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL NOT NULL,
    asset_type INT NOT NULL,
    asset_name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    base_pair_id INT NULL,
    user_id UUID NULL,
    CONSTRAINT assets_pk PRIMARY KEY (id),
    CONSTRAINT asset_type_fkey FOREIGN KEY (asset_type) REFERENCES asset_types(id)
);
CREATE TABLE IF NOT EXISTS asset_pairs (
    id SERIAL NOT NULL,
    pair1 INT NOT NULL,
    pair2 INT NOT NULL,
    CONSTRAINT asset_pairs_pk PRIMARY KEY (id),
    CONSTRAINT asset_pairs_pair1_asset_id_fkey FOREIGN KEY (pair1) REFERENCES assets(id),
    CONSTRAINT asset_pairs_pair2_asset_id_fkey FOREIGN KEY (pair2) REFERENCES assets(id)
);
CREATE TABLE IF NOT EXISTS asset_pairs_shared_metadata (
    pair_id INT NOT NULL,
    volume DECIMAL NULL,
    CONSTRAINT asset_pairs_shared_metadata_pkey PRIMARY KEY (pair_id),
    CONSTRAINT asset_pairs_shared_metadata_pair_id_fkey FOREIGN KEY (pair_id) REFERENCES asset_pairs(id)
);
CREATE TABLE IF NOT EXISTS asset_pairs_user_metadata (
    pair_id INT NOT NULL,
    exchange TEXT NULL,
    CONSTRAINT asset_pairs_user_metadata_pkey PRIMARY KEY (pair_id),
    CONSTRAINT asset_pairs_user_metadata_pair_id_fkey FOREIGN KEY (pair_id) REFERENCES asset_pairs(id)
);
CREATE TABLE IF NOT EXISTS asset_history (
    id SERIAL NOT NULL,
    pair_id INT NOT NULL,
    rate DECIMAL NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT asset_history_pair_date_unique UNIQUE (pair_id, recorded_at),
    CONSTRAINT asset_history_pk PRIMARY KEY (id),
    CONSTRAINT asset_history_pair_id_fkey FOREIGN KEY (pair_id) REFERENCES asset_pairs(id)
);
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL NOT NULL,
    role_name TEXT NOT NULL,
    CONSTRAINT user_roles_pk PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    default_asset INT NOT NULL,
    user_role INT DEFAULT 1 NOT NULL,
    CONSTRAINT users_pk PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username),
    CONSTRAINT user_roles_fkey FOREIGN KEY (user_role) REFERENCES user_roles(id),
    CONSTRAINT users_default_asset_fkey FOREIGN KEY (default_asset) REFERENCES assets(id)
);
ALTER TABLE assets
ADD CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id);
CREATE TABLE IF NOT EXISTS account (
    id UUID DEFAULT uuid_generate_v4() NOT NULL,
    user_id UUID NOT NULL,
    account_name TEXT NOT NULL,
    account_type INT NOT NULL,
    liquidity_type INT NOT NULL,
    active bool DEFAULT true NOT NULL,
    CONSTRAINT account_pk PRIMARY KEY (id),
    CONSTRAINT account_user_id_name_key UNIQUE (user_id, account_name),
    CONSTRAINT account_liquidity_type_fkey FOREIGN KEY (liquidity_type) REFERENCES account_liquidity_types(id),
    CONSTRAINT account_type_fkey FOREIGN KEY (account_type) REFERENCES account_types(id),
    CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS transaction (
    id UUID DEFAULT uuid_generate_v4() NOT NULL,
    group_id UUID NULL,
    user_id UUID NOT NULL,
    type_id INT NULL,
    date_transacted TIMESTAMPTZ NOT NULL,
    CONSTRAINT transaction_id_pkey PRIMARY KEY (id),
    CONSTRAINT transaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT transcation_type_fkey FOREIGN KEY (type_id) REFERENCES transaction_types(id),
    CONSTRAINT transcation_group_id_fkey FOREIGN KEY (group_id) REFERENCES transaction_group(id)
);
CREATE TABLE IF NOT EXISTS transaction_dividends (
    transaction_id UUID NOT NULL,
    source_asset_id INT NOT NULL,
    CONSTRAINT transaction_dividends_transaction_id_pkey PRIMARY KEY (transaction_id),
    CONSTRAINT transaction_dividends_source_asset_id_fkey FOREIGN KEY (source_asset_id) REFERENCES assets(id),
    CONSTRAINT transaction_dividends_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction(id)
);
CREATE TABLE IF NOT EXISTS transaction_descriptions (
    transaction_id UUID NOT NULL,
    description TEXT NOT NULL,
    CONSTRAINT transaction_descriptions_transaction_id_pkey PRIMARY KEY (transaction_id),
    CONSTRAINT transaction_descriptions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction(id)
);
CREATE TABLE IF NOT EXISTS entry (
    id SERIAL NOT NULL,
    asset_id INT NOT NULL,
    account_id UUID NOT NULL,
    quantity DECIMAL NOT NULL,
    category_id INT NOT NULL,
    transaction_id UUID NOT NULL,
    CONSTRAINT entry_pk PRIMARY KEY (id),
    CONSTRAINT entry_account_id_fkey FOREIGN KEY (account_id) REFERENCES account(id),
    CONSTRAINT entry_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id),
    CONSTRAINT entry_transaction__id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction(id),
    CONSTRAINT transaction_category_id_fkey FOREIGN KEY (category_id) REFERENCES transaction_categories(id)
);
CREATE TABLE IF NOT EXISTS transaction_categories_static_mapping (
    enum_id INT NOT NULL,
    enum_index INT NOT NULL,
    category_mapping INT NOT NULL,
    CONSTRAINT transaction_categories_fees_enum_pk PRIMARY KEY (enum_id, enum_index),
    CONSTRAINT transaction_categories_fees_enum_transaction_categories_fk FOREIGN KEY (category_mapping) REFERENCES transaction_categories(id)
);