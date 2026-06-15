ALTER TABLE ai_conversations ADD COLUMN last_error JSONB;

ALTER TABLE ai_workflow_quick_upload
    DROP CONSTRAINT ai_workflow_quick_upload_status_check;
ALTER TABLE ai_workflow_quick_upload
    ADD CONSTRAINT ai_workflow_quick_upload_status_check
    CHECK (status IN ('pending', 'processing', 'retrying', 'proposal_ready', 'accepted', 'rejected', 'failed'));

-- Increase per-user and global token limits 10x
UPDATE token_rate_limits SET
    hourly_input_tokens = hourly_input_tokens * 10,
    hourly_output_tokens = hourly_output_tokens * 10,
    monthly_input_tokens = monthly_input_tokens * 10,
    monthly_output_tokens = monthly_output_tokens * 10;

UPDATE global_token_rate_limits SET
    hourly_input_tokens = hourly_input_tokens * 10,
    hourly_output_tokens = hourly_output_tokens * 10,
    monthly_input_tokens = monthly_input_tokens * 10,
    monthly_output_tokens = monthly_output_tokens * 10;
