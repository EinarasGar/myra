DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS public.transaction_types (
    id SERIAL CONSTRAINT transaction_types_pk PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.asset_types (
    id SERIAL CONSTRAINT asset_types_pk PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.category_type (
    id SERIAL CONSTRAINT category_type_pk PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.account_types (
    id SERIAL CONSTRAINT account_types_pk PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id SERIAL CONSTRAINT transaction_categories_pk PRIMARY KEY,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    type int CONSTRAINT transaction_categories_type_fkey REFERENCES public.category_type (id)
);
CREATE TABLE IF NOT EXISTS public.transaction_descriptions (
    transaction_id UUID CONSTRAINT transaction_descriptions_pk PRIMARY KEY,
    description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.transaction_group (
    transaction_group_id UUID CONSTRAINT transaction_group_descriptions_pk PRIMARY KEY,
    category_id INT NOT NULL CONSTRAINT transaction_group_category_id_fkey REFERENCES public.transaction_categories (id),
    description TEXT NOT NULL,
    date_added TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS public.asset_pairs (
    id SERIAL CONSTRAINT asset_pairs_pk PRIMARY KEY,
    pair1 INT NOT NULL,
    pair2 INT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.asset_history (
    id SERIAL CONSTRAINT asset_history_pk PRIMARY KEY,
    pair_id INT NOT NULL CONSTRAINT asset_history_pair_id_fkey REFERENCES public.asset_pairs (id),
    rate numeric NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    CONSTRAINT asset_history_pair_date_unique UNIQUE (pair_id, date)
);
CREATE TABLE IF NOT EXISTS public.assets (
    id SERIAL CONSTRAINT assets_pk PRIMARY KEY,
    asset_type INT NOT NULL CONSTRAINT asset_type_fkey REFERENCES public.asset_types (id),
    name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    base_pair_id INT,
    user_id UUID
);
CREATE TABLE IF NOT EXISTS public.user_roles (
    id SERIAL CONSTRAINT user_roles_pk PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.users (
    id UUID CONSTRAINT users_pk PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    default_asset INT NOT NULL CONSTRAINT users_default_asset_fkey REFERENCES public.assets (id),
    role INT NOT NULL CONSTRAINT user_roles_fkey REFERENCES public.user_roles (id) DEFAULT 1
);
ALTER TABLE public.assets
ADD CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id);
CREATE TABLE IF NOT EXISTS public.account (
    id UUID CONSTRAINT account_pk PRIMARY KEY,
    user_id UUID NOT NULL CONSTRAINT portfolio_user_id_fkey REFERENCES public.users (id),
    name TEXT NOT NULL,
    type int CONSTRAINT account_type_fkey REFERENCES public.account_types (id),
    UNIQUE (user_id, name)
);
CREATE TABLE IF NOT EXISTS public.transaction (
    id UUID NOT NULL CONSTRAINT transaction_id_pkey PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID,
    user_id UUID NOT NULL CONSTRAINT transaction_user_id_fkey REFERENCES public.users (id),
    type_id int CONSTRAINT transcation_type_fkey REFERENCES public.transaction_types (id),
    date TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS public.dividends (
    transaction_id UUID NOT NULL CONSTRAINT dividends_transaction_id_pkey_fkey PRIMARY KEY REFERENCES public.transaction (id),
    source_asset_id INT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.entry (
    id SERIAL CONSTRAINT entry_pk PRIMARY KEY,
    asset_id INT NOT NULL CONSTRAINT entry_asset_id_fkey REFERENCES public.assets (id),
    account_id UUID NOT NULL CONSTRAINT entry_account_id_fkey REFERENCES public.account (id),
    quantity NUMERIC NOT NULL,
    category_id INT NOT NULL CONSTRAINT transaction_category_id_fkey REFERENCES public.transaction_categories (id),
    transaction_id UUID CONSTRAINT entry_transaction__id_fkey REFERENCES public.transaction (id)
);