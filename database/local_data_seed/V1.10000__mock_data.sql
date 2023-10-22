INSERT INTO asset_types (name)
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
INSERT INTO assets (asset_type, name, ticker)
VALUES (1, 'US Dollar', 'USD'),
    (1, 'Euro', 'EUR'),
    (1, 'British Pound', 'GBP');
INSERT INTO user_roles (name)
VALUES ('User'),
    ('Admin');
INSERT INTO transaction_categories (category, icon, type)
VALUES ('Income', 'attach_money', null),
    ('Investment', 'trending_up', 'investments'),
    ('Fees', 'money_off', 'fees'),
    ('Transport', 'directions_transit', null),
    ('Entertainment', 'movie', null),
    ('Bills', 'money_off', null),
    ('Fast Food', 'fastfood', null),
    ('Parking', 'parking', null),
    ('Groceries', 'shopping_cart', null),
    ('Fuel', 'local_gas_station', null);
INSERT INTO users (id, username, password, default_asset, role)
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'einaras',
        '$argon2id$v=19$m=19456,t=2,p=1$cA/2g90uUzqvdHXniTwyBA$WIbpl9GH5JD93dpkDT8gHkMQOMeeNZkqhI5OKUS8/uc',
        1,
        2
    );
INSERT INTO portfolio_account (id, user_id, name)
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'Default'
    );