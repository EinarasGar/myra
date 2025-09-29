-- Migration: Add user-specific categories support
-- Version: V2.0
-- Description: Enables user-specific categories and category types

BEGIN;

-- ============================================
-- TRANSACTION CATEGORIES TABLE MODIFICATIONS
-- ============================================

-- Add user_id column
ALTER TABLE transaction_categories
ADD COLUMN user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE;

-- No timestamp tracking needed for categories

-- Add unique constraint for user-category combination (case-insensitive)
CREATE UNIQUE INDEX unique_user_category
ON transaction_categories(user_id, LOWER(category));

-- Performance indexes
CREATE INDEX idx_transaction_categories_user_id
ON transaction_categories(user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX idx_transaction_categories_user_category
ON transaction_categories(user_id, LOWER(category));

CREATE INDEX idx_transaction_categories_category_lower
ON transaction_categories(LOWER(category));

-- ============================================
-- TRANSACTION CATEGORY TYPE TABLE MODIFICATIONS
-- ============================================

-- Add user_id column
ALTER TABLE transaction_category_type
ADD COLUMN user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE;

-- No timestamp tracking needed

-- Add unique constraint for user-type combination (case-insensitive)
CREATE UNIQUE INDEX unique_user_category_type
ON transaction_category_type(user_id, LOWER(category_type_name));

-- Performance indexes
CREATE INDEX idx_transaction_category_type_user_id
ON transaction_category_type(user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX idx_transaction_category_type_user_type
ON transaction_category_type(user_id, LOWER(category_type_name));

CREATE INDEX idx_transaction_category_type_name_lower
ON transaction_category_type(LOWER(category_type_name));

-- No triggers needed since we're not tracking timestamps

COMMIT;