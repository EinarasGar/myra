CREATE TABLE ai_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);

CREATE TABLE ai_messages (
    id                  UUID NOT NULL DEFAULT uuidv7(),
    conversation_id     UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL
                        CHECK (role IN ('user', 'assistant', 'tool_call', 'tool_result', 'tool_approval')),
    content             JSONB NOT NULL,
    file_ids            UUID[] DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);

CREATE TABLE ai_workflow_quick_upload (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'proposal_ready', 'accepted', 'rejected', 'failed')),
    source_file_id      UUID NOT NULL REFERENCES user_files(id),
    proposal_type       VARCHAR(30)
                        CHECK (proposal_type IS NULL OR proposal_type IN ('transaction', 'transaction_group')),
    proposal_data       JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_quick_upload_conversation UNIQUE (conversation_id)
);

CREATE INDEX idx_ai_workflow_quick_upload_status ON ai_workflow_quick_upload(status);
