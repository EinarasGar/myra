INSERT INTO transaction_types (id, transaction_type_name)
VALUES (13, 'Cash Balance Transfer')
ON CONFLICT (id) DO NOTHING;
SELECT setval('transaction_types_id_seq', (SELECT MAX(id) FROM transaction_types));

INSERT INTO transaction_categories (category, icon, category_type)
SELECT 'Cash Balance Transfer', 'money_off', 3
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_categories
    WHERE category = 'Cash Balance Transfer' AND user_id IS NULL
);

INSERT INTO transaction_categories_static_mapping (enum_id, enum_index, category_mapping)
SELECT 2, 12, id FROM transaction_categories
WHERE category = 'Cash Balance Transfer' AND user_id IS NULL
ON CONFLICT (enum_id, enum_index) DO NOTHING;
