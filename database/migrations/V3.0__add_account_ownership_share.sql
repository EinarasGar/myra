ALTER TABLE account ADD COLUMN ownership_share DECIMAL NOT NULL DEFAULT 1.0;
ALTER TABLE account ADD CONSTRAINT account_ownership_share_range
    CHECK (ownership_share > 0 AND ownership_share <= 1.0);
