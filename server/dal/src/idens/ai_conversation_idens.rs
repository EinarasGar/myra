use sea_query::Iden;

pub enum AiConversationsIden {
    Table,
    Id,
    UserId,
    Title,
    CreatedAt,
    UpdatedAt,
}

impl Iden for AiConversationsIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "ai_conversations",
            Self::Id => "id",
            Self::UserId => "user_id",
            Self::Title => "title",
            Self::CreatedAt => "created_at",
            Self::UpdatedAt => "updated_at",
        }
    }
}

pub enum AiMessagesIden {
    Table,
    Id,
    ConversationId,
    Role,
    Content,
    FileIds,
    CreatedAt,
}

impl Iden for AiMessagesIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "ai_messages",
            Self::Id => "id",
            Self::ConversationId => "conversation_id",
            Self::Role => "role",
            Self::Content => "content",
            Self::FileIds => "file_ids",
            Self::CreatedAt => "created_at",
        }
    }
}

pub enum AiWorkflowQuickUploadIden {
    Table,
    Id,
    ConversationId,
    Status,
    SourceFileId,
    ProposalType,
    ProposalData,
    CreatedAt,
    UpdatedAt,
}

impl Iden for AiWorkflowQuickUploadIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "ai_workflow_quick_upload",
            Self::Id => "id",
            Self::ConversationId => "conversation_id",
            Self::Status => "status",
            Self::SourceFileId => "source_file_id",
            Self::ProposalType => "proposal_type",
            Self::ProposalData => "proposal_data",
            Self::CreatedAt => "created_at",
            Self::UpdatedAt => "updated_at",
        }
    }
}
