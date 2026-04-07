INSERT INTO users (id, username, default_asset)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'User',
    (SELECT id FROM assets WHERE ticker = 'GBP')
)
ON CONFLICT (id) DO UPDATE SET default_asset = EXCLUDED.default_asset
;


INSERT INTO user_role_assignments (user_id, role_id)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    2
)
;

