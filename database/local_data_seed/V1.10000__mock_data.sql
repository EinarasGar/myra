INSERT INTO asset_types (asset_type_name)
VALUES ('Currencies'),
    ('Stocks'),
    ('Bonds'),
    ('Mutual Funds'),
    ('ETFs'),
    ('Commodities'),
    ('Real Estate'),
    ('Cryptocurrencies'),
    ('Options'),
    ('Futures'),
    ('Derivatives'),
    ('Art'),
    ('Collectibles'),
    ('Precious Metals');
INSERT INTO assets (asset_type, asset_name, ticker, base_pair_id)
VALUES (1, 'US Dollar', 'USD', NULL),
    (1, 'Euro', 'EUR', NULL),
    (1, 'British Pound', 'GBP', NULL),
    (2, 'Apple', 'AAPL', 1),
    (5, 'Vanguard S&P 500 UCITS ETF', 'VUSA.L', 3);
INSERT INTO user_roles (role_name)
VALUES ('User'),
    ('Admin');
INSERT INTO transaction_category_type (category_type_name)
VALUES ('Income'),
    ('Expense'),
    ('Investments'),
    ('Fees');
INSERT INTO transaction_categories (category, icon, category_type)
VALUES ('Income', 'attach_money', 1),
    ('Investment', 'trending_up', 3),
    ('Fees', 'money_off', 4),
    ('Transport', 'directions_transit', 2),
    ('Entertainment', 'movie', 2),
    ('Bills', 'money_off', 2),
    ('Fast Food', 'fastfood', 2),
    ('Parking', 'parking', 2),
    ('Groceries', 'shopping_cart', 2),
    ('Fuel', 'local_gas_station', 2),
    ('Exchange Fees', 'money_off', 4),
    ('Transaction Fees', 'money_off', 4),
    ('Asset Purchase', 'money_off', 3);
INSERT INTO users (
        id,
        username,
        password_hash,
        default_asset,
        user_role
    )
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'einaras',
        '$argon2id$v=19$m=19456,t=2,p=1$cA/2g90uUzqvdHXniTwyBA$WIbpl9GH5JD93dpkDT8gHkMQOMeeNZkqhI5OKUS8/uc',
        1,
        2
    );
INSERT INTO account_liquidity_types (id, liquidity_type_name)
VALUES (1, 'Liquid');
INSERT INTO account_types (id, account_type_name)
VALUES (1, 'Current'),
    (2, 'ISA');
INSERT INTO account (
        id,
        user_id,
        account_name,
        account_type,
        liquidity_type,
        active
    )
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'Default',
        1,
        1,
        true
    );
INSERT INTO public.transaction_categories_static_mapping (enum_id, enum_index, category_mapping)
VALUES (1, 1, 12),
    (1, 2, 11),
    (2, 1, 13);
INSERT INTO transaction_types (id, transaction_type_name)
VALUES (1, 'Regular'),
    (9, 'Asset Purchase');
INSERT INTO public.asset_pairs (pair1, pair2)
VALUES (4, 1),
    (4, 2),
    (5, 3);
INSERT INTO public.asset_pairs_shared_metadata (pair_id, volume)
VALUES (1, 76249821);