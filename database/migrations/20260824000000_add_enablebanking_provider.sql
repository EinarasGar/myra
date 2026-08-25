INSERT INTO connector_provider (kind, display_name) VALUES
    ('enablebanking', 'Enable Banking')
ON CONFLICT (kind) DO NOTHING;
