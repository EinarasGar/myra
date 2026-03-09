CREATE INDEX IF NOT EXISTS idx_transaction_group_id ON transaction(group_id) WHERE group_id IS NOT NULL;
