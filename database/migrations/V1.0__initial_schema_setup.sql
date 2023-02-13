CREATE TABLE IF NOT EXISTS public.transaction_categories
(
    id INT CONSTRAINT transaction_categories_pk PRIMARY KEY,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_descriptions
(
    transaction_id INT CONSTRAINT transaction_descriptions_pk PRIMARY KEY,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_file_types
(
    id INT CONSTRAINT transaction_file_types_pk PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_files
(
    transaction_id INT CONSTRAINT transaction_files_pk PRIMARY KEY,
    type INT NOT NULL CONSTRAINT transaction_files_type_fkey REFERENCES public.transaction_file_types (id),
    description TEXT NOT NULL,
    file TEXT NOT NULL -- probably s3 url?
);

CREATE TABLE IF NOT EXISTS public.asset_pairs
(
    id INT CONSTRAINT asset_pairs_pk PRIMARY KEY,
    pair1 INT NOT NULL,
    pair2 INT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.asset_history
(
    id INT CONSTRAINT asset_history_pk PRIMARY KEY,
    pair_id INT NOT NULL CONSTRAINT asset_history_pair_id_fkey REFERENCES public.asset_pairs (id),
    rate numeric NOT NULL,
    date timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS public.asset_types
(
    id INT CONSTRAINT asset_types_pk PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assets
(
    id INT CONSTRAINT assets_pk PRIMARY KEY,
    asset_type INT NOT NULL CONSTRAINT asset_type_fkey REFERENCES public.asset_types (id),
    name TEXT NOT NULL,
    ticker TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users
(
    id INT CONSTRAINT users_pk PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    default_asset INT NOT NULL CONSTRAINT users_default_asset_fkey REFERENCES public.assets (id)
);

CREATE TABLE IF NOT EXISTS public.portfolio
(
    id INT CONSTRAINT portfolio_pk PRIMARY KEY,
    user_id INT NOT NULL CONSTRAINT portfolio_user_id_fkey REFERENCES public.users (id),
    asset_id INT NOT NULL CONSTRAINT portfolio_asset_id_fkey REFERENCES public.assets (id),
    sum NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction
(
    id INT CONSTRAINT transaction_pk PRIMARY KEY,
    user_id INT NOT NULL CONSTRAINT transaction_user_id_fkey REFERENCES public.users (id),
    group_id INT NOT NULL,
    portfolio_id INT NOT NULL CONSTRAINT transaction_portfolio_id_fkey REFERENCES public.portfolio (id),
    category_id INT NOT NULL CONSTRAINT transaction_category_id_fkey REFERENCES public.transaction_categories (id),
    quantity NUMERIC NOT NULL,
    date TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public.portfolio_history
(
    id INT CONSTRAINT portfolio_history_pk PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    user_id INT NOT NULL CONSTRAINT portfolio_history_user_id_fkey REFERENCES public.users (id),
    asset_id INT NOT NULL CONSTRAINT portfolio_history_asset_id_fkey REFERENCES public.assets (id),
    reference_asset_id INT NOT NULL CONSTRAINT portfolio_history_reference_asset_id_fkey REFERENCES public.assets (id),
    sum NUMERIC NOT NULL
);