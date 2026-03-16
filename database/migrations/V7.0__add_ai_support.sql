CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE transaction_descriptions ADD COLUMN embedding vector(1536);
ALTER TABLE transaction_group ADD COLUMN description_embedding vector(1536);

CREATE INDEX idx_td_embedding ON transaction_descriptions USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_tg_embedding ON transaction_group USING hnsw (description_embedding vector_cosine_ops);
