INSERT INTO users (id, username, default_asset)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'User',
    NULL
)
ON CONFLICT (id) DO NOTHING
;


INSERT INTO user_role_assignments (user_id, role_id)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    2
)
ON CONFLICT DO NOTHING
;
