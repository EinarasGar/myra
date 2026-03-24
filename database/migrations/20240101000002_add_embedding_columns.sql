ALTER TABLE assets ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_assets_embedding ON assets USING hnsw (embedding vector_cosine_ops);

ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_transaction_categories_embedding ON transaction_categories USING hnsw (embedding vector_cosine_ops);
