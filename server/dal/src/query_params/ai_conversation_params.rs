use std::fmt;

use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

use super::paging_params::PagingParams;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuickUploadStatus {
    Pending,
    Processing,
    ProposalReady,
    Accepted,
    Rejected,
    Failed,
}

impl QuickUploadStatus {
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            Self::ProposalReady | Self::Accepted | Self::Rejected | Self::Failed
        )
    }
}

impl fmt::Display for QuickUploadStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Processing => write!(f, "processing"),
            Self::ProposalReady => write!(f, "proposal_ready"),
            Self::Accepted => write!(f, "accepted"),
            Self::Rejected => write!(f, "rejected"),
            Self::Failed => write!(f, "failed"),
        }
    }
}

impl std::str::FromStr for QuickUploadStatus {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "processing" => Ok(Self::Processing),
            "proposal_ready" => Ok(Self::ProposalReady),
            "accepted" => Ok(Self::Accepted),
            "rejected" => Ok(Self::Rejected),
            "failed" => Ok(Self::Failed),
            _ => Err(anyhow::anyhow!("Unknown quick upload status: {s}")),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProposalType {
    Transaction,
    TransactionGroup,
}

impl fmt::Display for ProposalType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Transaction => write!(f, "transaction"),
            Self::TransactionGroup => write!(f, "transaction_group"),
        }
    }
}

impl std::str::FromStr for ProposalType {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "transaction" => Ok(Self::Transaction),
            "transaction_group" => Ok(Self::TransactionGroup),
            _ => Err(anyhow::anyhow!("Unknown proposal type: {s}")),
        }
    }
}

pub struct GetConversationsParams {
    pub user_id: Uuid,
    pub search_type: GetConversationsSearchType,
    pub paging: Option<PagingParams>,
}

pub enum GetConversationsSearchType {
    ById(Uuid),
    All,
}

impl GetConversationsParams {
    pub fn by_id(conversation_id: Uuid, user_id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetConversationsSearchType::ById(conversation_id),
            paging: None,
        }
    }

    pub fn all(user_id: Uuid, start: u64, count: u64) -> Self {
        Self {
            user_id,
            search_type: GetConversationsSearchType::All,
            paging: Some(PagingParams { start, count }),
        }
    }
}

pub struct GetMessagesParams {
    pub conversation_id: Uuid,
    pub user_id: Uuid,
    pub after_id: Option<Uuid>,
    pub limit: u64,
}

pub struct GetQuickUploadsParams {
    pub user_id: Uuid,
    pub search_type: GetQuickUploadsSearchType,
    pub paging: Option<PagingParams>,
}

pub enum GetQuickUploadsSearchType {
    ById(Uuid),
    All {
        status_filter: Option<Vec<QuickUploadStatus>>,
    },
}

impl GetQuickUploadsParams {
    pub fn by_id(quick_upload_id: Uuid, user_id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetQuickUploadsSearchType::ById(quick_upload_id),
            paging: None,
        }
    }

    pub fn all(
        user_id: Uuid,
        status_filter: Option<Vec<QuickUploadStatus>>,
        start: u64,
        count: u64,
    ) -> Self {
        Self {
            user_id,
            search_type: GetQuickUploadsSearchType::All { status_filter },
            paging: Some(PagingParams { start, count }),
        }
    }
}
