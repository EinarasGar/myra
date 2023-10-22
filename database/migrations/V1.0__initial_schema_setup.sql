DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE category_type AS ENUM ('fees', 'investments');
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id SERIAL CONSTRAINT transaction_categories_pk PRIMARY KEY,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    type category_type
);
CREATE TABLE IF NOT EXISTS public.transaction_descriptions (
    transaction_id INT CONSTRAINT transaction_descriptions_pk PRIMARY KEY,
    description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.transaction_group (
    transaction_group_id UUID CONSTRAINT transaction_group_descriptions_pk PRIMARY KEY,
    category_id INT NOT NULL CONSTRAINT transaction_group_category_id_fkey REFERENCES public.transaction_categories (id),
    description TEXT NOT NULL,
    date_added TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS public.transaction_file_types (
    id SERIAL CONSTRAINT transaction_file_types_pk PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.transaction_files (
    transaction_id INT CONSTRAINT transaction_files_pk PRIMARY KEY,
    type INT NOT NULL CONSTRAINT transaction_files_type_fkey REFERENCES public.transaction_file_types (id),
    description TEXT NOT NULL,
    file TEXT NOT NULL -- probably s3 url?
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
CREATE TABLE IF NOT EXISTS public.asset_types (
    id SERIAL CONSTRAINT asset_types_pk PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.assets (
    id SERIAL CONSTRAINT assets_pk PRIMARY KEY,
    asset_type INT NOT NULL CONSTRAINT asset_type_fkey REFERENCES public.asset_types (id),
    name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    base_pair_id INT,
    link_id UUID,
    user_id UUID CONSTRAINT assets_user_id_fkey REFERENCES public.users (id)
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
CREATE TABLE IF NOT EXISTS public.portfolio_account (
    id UUID CONSTRAINT portfolio_account_pk PRIMARY KEY,
    user_id UUID NOT NULL CONSTRAINT portfolio_user_id_fkey REFERENCES public.users (id),
    name TEXT NOT NULL,
    UNIQUE (user_id, name)
);
CREATE TABLE IF NOT EXISTS public.portfolio (
    user_id UUID NOT NULL CONSTRAINT portfolio_user_id_fkey REFERENCES public.users (id),
    asset_id INT NOT NULL CONSTRAINT portfolio_asset_id_fkey REFERENCES public.assets (id),
    account_id UUID NOT NULL CONSTRAINT portfolio_account_id_fkey REFERENCES public.portfolio_account (id),
    sum NUMERIC NOT NULL,
    CONSTRAINT portfolio_user_id_asset_id_pk PRIMARY KEY(user_id, asset_id, account_id)
);
CREATE TABLE IF NOT EXISTS public.transaction (
    id SERIAL CONSTRAINT transaction_pk PRIMARY KEY,
    user_id UUID NOT NULL CONSTRAINT transaction_user_id_fkey REFERENCES public.users (id),
    group_id UUID NOT NULL,
    asset_id INT NOT NULL CONSTRAINT transaction_asset_id_fkey REFERENCES public.assets (id),
    account_id UUID NOT NULL CONSTRAINT transaction_account_id_fkey REFERENCES public.portfolio_account (id),
    category_id INT NOT NULL CONSTRAINT transaction_category_id_fkey REFERENCES public.transaction_categories (id),
    quantity NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    CONSTRAINT transaction_user_id_asset_id_fkey FOREIGN KEY(user_id, asset_id, account_id) REFERENCES public.portfolio(user_id, asset_id, account_id)
);
CREATE TABLE IF NOT EXISTS public.portfolio_history (
    id SERIAL CONSTRAINT portfolio_history_pk PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL CONSTRAINT portfolio_history_user_id_fkey REFERENCES public.users (id),
    asset_id INT NOT NULL CONSTRAINT portfolio_history_asset_id_fkey REFERENCES public.assets (id),
    reference_asset_id INT NOT NULL CONSTRAINT portfolio_history_reference_asset_id_fkey REFERENCES public.assets (id),
    sum NUMERIC NOT NULL
);