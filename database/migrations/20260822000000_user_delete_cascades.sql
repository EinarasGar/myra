-- Make user deletion work: user-owned data cascades, and remaining NO ACTION
-- FKs that would block the cascade mid-transaction become DEFERRABLE INITIALLY
-- DEFERRED so they are checked at commit time instead.
-- Each FK is dropped and re-added keeping its original constraint name.

-- account
ALTER TABLE account DROP CONSTRAINT account_user_id_fkey;
ALTER TABLE account ADD CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- transaction
ALTER TABLE transaction DROP CONSTRAINT transaction_user_id_fkey;
ALTER TABLE transaction ADD CONSTRAINT transaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transaction DROP CONSTRAINT transcation_group_id_fkey;
ALTER TABLE transaction ADD CONSTRAINT transcation_group_id_fkey FOREIGN KEY (group_id) REFERENCES transaction_group(id) ON DELETE CASCADE;

-- assets
ALTER TABLE assets DROP CONSTRAINT assets_user_id_fkey;
ALTER TABLE assets ADD CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- entry
ALTER TABLE entry DROP CONSTRAINT entry_account_id_fkey;
ALTER TABLE entry ADD CONSTRAINT entry_account_id_fkey FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE;
ALTER TABLE entry DROP CONSTRAINT entry_transaction__id_fkey;
ALTER TABLE entry ADD CONSTRAINT entry_transaction__id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE CASCADE;

-- transaction lookalikes
ALTER TABLE transaction_descriptions DROP CONSTRAINT transaction_descriptions_transaction_id_fkey;
ALTER TABLE transaction_descriptions ADD CONSTRAINT transaction_descriptions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE CASCADE;
ALTER TABLE transaction_dividends DROP CONSTRAINT transaction_dividends_transaction_id_fkey;
ALTER TABLE transaction_dividends ADD CONSTRAINT transaction_dividends_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE CASCADE;

-- account_identifier
ALTER TABLE account_identifier DROP CONSTRAINT account_identifier_account_fk;
ALTER TABLE account_identifier ADD CONSTRAINT account_identifier_account_fk FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE;

-- asset_pairs
ALTER TABLE asset_pairs DROP CONSTRAINT asset_pairs_pair1_asset_id_fkey;
ALTER TABLE asset_pairs ADD CONSTRAINT asset_pairs_pair1_asset_id_fkey FOREIGN KEY (pair1) REFERENCES assets(id) ON DELETE CASCADE;
ALTER TABLE asset_pairs DROP CONSTRAINT asset_pairs_pair2_asset_id_fkey;
ALTER TABLE asset_pairs ADD CONSTRAINT asset_pairs_pair2_asset_id_fkey FOREIGN KEY (pair2) REFERENCES assets(id) ON DELETE CASCADE;

-- asset_pairs children
ALTER TABLE asset_history DROP CONSTRAINT asset_history_pair_id_fkey;
ALTER TABLE asset_history ADD CONSTRAINT asset_history_pair_id_fkey FOREIGN KEY (pair_id) REFERENCES asset_pairs(id) ON DELETE CASCADE;
ALTER TABLE asset_pairs_shared_metadata DROP CONSTRAINT asset_pairs_shared_metadata_pair_id_fkey;
ALTER TABLE asset_pairs_shared_metadata ADD CONSTRAINT asset_pairs_shared_metadata_pair_id_fkey FOREIGN KEY (pair_id) REFERENCES asset_pairs(id) ON DELETE CASCADE;
ALTER TABLE asset_pairs_user_metadata DROP CONSTRAINT asset_pairs_user_metadata_pair_id_fkey;
ALTER TABLE asset_pairs_user_metadata ADD CONSTRAINT asset_pairs_user_metadata_pair_id_fkey FOREIGN KEY (pair_id) REFERENCES asset_pairs(id) ON DELETE CASCADE;

-- connector_binding
ALTER TABLE connector_binding DROP CONSTRAINT connector_binding_sverto_account_id_fkey;
ALTER TABLE connector_binding ADD CONSTRAINT connector_binding_sverto_account_id_fkey FOREIGN KEY (sverto_account_id) REFERENCES account(id) ON DELETE CASCADE;

-- entry (deferrable)
ALTER TABLE entry DROP CONSTRAINT transaction_category_id_fkey;
ALTER TABLE entry ADD CONSTRAINT transaction_category_id_fkey FOREIGN KEY (category_id) REFERENCES transaction_categories(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE entry DROP CONSTRAINT entry_asset_id_fkey;
ALTER TABLE entry ADD CONSTRAINT entry_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) DEFERRABLE INITIALLY DEFERRED;

-- transaction_categories (deferrable)
ALTER TABLE transaction_categories DROP CONSTRAINT transaction_categories_type_fkey;
ALTER TABLE transaction_categories ADD CONSTRAINT transaction_categories_type_fkey FOREIGN KEY (category_type) REFERENCES transaction_category_type(id) DEFERRABLE INITIALLY DEFERRED;

-- transaction_categories_static_mapping (deferrable)
ALTER TABLE transaction_categories_static_mapping DROP CONSTRAINT transaction_categories_fees_enum_transaction_categories_fk;
ALTER TABLE transaction_categories_static_mapping ADD CONSTRAINT transaction_categories_fees_enum_transaction_categories_fk FOREIGN KEY (category_mapping) REFERENCES transaction_categories(id) DEFERRABLE INITIALLY DEFERRED;

-- transaction_group (deferrable)
ALTER TABLE transaction_group DROP CONSTRAINT transaction_group_category_id_fkey;
ALTER TABLE transaction_group ADD CONSTRAINT transaction_group_category_id_fkey FOREIGN KEY (category_id) REFERENCES transaction_categories(id) DEFERRABLE INITIALLY DEFERRED;

-- ai_workflow_quick_upload (deferrable)
ALTER TABLE ai_workflow_quick_upload DROP CONSTRAINT ai_workflow_quick_upload_source_file_id_fkey;
ALTER TABLE ai_workflow_quick_upload ADD CONSTRAINT ai_workflow_quick_upload_source_file_id_fkey FOREIGN KEY (source_file_id) REFERENCES user_files(id) DEFERRABLE INITIALLY DEFERRED;

-- transaction_dividends (deferrable)
ALTER TABLE transaction_dividends DROP CONSTRAINT transaction_dividends_source_asset_id_fkey;
ALTER TABLE transaction_dividends ADD CONSTRAINT transaction_dividends_source_asset_id_fkey FOREIGN KEY (source_asset_id) REFERENCES assets(id) DEFERRABLE INITIALLY DEFERRED;
