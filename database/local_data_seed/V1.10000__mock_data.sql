INSERT INTO asset_types (name)
VALUES ('Currencies');
INSERT INTO assets (asset_type, name, ticker)
VALUES (1, 'EUR', 'EUR');
INSERT INTO user_roles (name)
VALUES ('User');
INSERT INTO user_roles (name)
VALUES ('Admin');
INSERT INTO transaction_categories (category)
VALUES ('Income');
INSERT INTO users (id, username, password, default_asset, role)
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'einaras',
        '$argon2id$v=19$m=19456,t=2,p=1$cA/2g90uUzqvdHXniTwyBA$WIbpl9GH5JD93dpkDT8gHkMQOMeeNZkqhI5OKUS8/uc',
        1,
        2
    );