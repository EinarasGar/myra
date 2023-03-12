INSERT INTO asset_types (id, name)
VALUES (1, 'Currencies');
INSERT INTO assets (id, asset_type, name, ticker)
VALUES (1, 1, 'EUR', 'EUR');
INSERT INTO user_roles (id, name)
VALUES (1, 'User');
INSERT INTO user_roles (id, name)
VALUES (2, 'Admin');
INSERT INTO users (id, username, password, default_asset, role)
VALUES (
        '2396480f-0052-4cf0-81dc-8cedbde5ce13',
        'einaras',
        '$argon2id$v=19$m=19456,t=2,p=1$cA/2g90uUzqvdHXniTwyBA$WIbpl9GH5JD93dpkDT8gHkMQOMeeNZkqhI5OKUS8/uc',
        1,
        2
    );