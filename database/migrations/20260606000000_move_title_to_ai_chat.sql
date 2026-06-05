-- Split chat-only state out of ai_conversations into a 1:1 ai_chat subtype.
-- ai_conversations stays the generic supertype shared by chats and quick-upload
-- workflows; ai_chat holds chat-only state (the title). Quick-upload
-- conversations get no ai_chat row.

CREATE TABLE ai_chat (
    conversation_id UUID PRIMARY KEY REFERENCES ai_conversations(id) ON DELETE CASCADE,
    title           TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill: every existing conversation that is not a quick-upload workflow is a
-- chat. Carry its title across before dropping the source column.
INSERT INTO ai_chat (conversation_id, title)
SELECT c.id, c.title
FROM ai_conversations c
WHERE NOT EXISTS (
    SELECT 1 FROM ai_workflow_quick_upload q WHERE q.conversation_id = c.id
);

ALTER TABLE ai_conversations DROP COLUMN title;
