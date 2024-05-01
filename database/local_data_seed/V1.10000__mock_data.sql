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
INSERT INTO category_type (id, name)
VALUES (1, 'Income'),
    (2, 'Expense'),
    (3, 'Investments'),
    (4, 'Fees');
INSERT INTO transaction_categories (category, icon, type)
VALUES ('Income', 'attach_money', 1),
    ('Investment', 'trending_up', 3),
    ('Fees', 'money_off', 4),
    ('Transport', 'directions_transit', 2),
    ('Entertainment', 'movie', 2),
    ('Bills', 'money_off', 2),
    ('Fast Food', 'fastfood', 2),
    ('Parking', 'parking', 2),
    ('Groceries', 'shopping_cart', 2),
    ('Fuel', 'local_gas_station', 2);
INSERT INTO users (id, username, password, default_asset, role)
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'einaras',
        '$argon2id$v=19$m=19456,t=2,p=1$cA/2g90uUzqvdHXniTwyBA$WIbpl9GH5JD93dpkDT8gHkMQOMeeNZkqhI5OKUS8/uc',
        1,
        2
    );
INSERT INTO account (id, user_id, name)
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'Default'
    );
INSERT INTO transaction_types (id, name)
VALUES (1, 'regular');