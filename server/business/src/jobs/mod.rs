use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmbeddingJob {
    Transaction { transaction_id: Uuid, text: String },
    Group { group_id: Uuid, text: String },
    Asset { asset_id: i32, text: String },
    Category { category_id: i32, text: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileProcessingJob {
    pub file_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QuickUploadJob {
    Process {
        quick_upload_id: Uuid,
        user_id: Uuid,
    },
    Correction {
        quick_upload_id: Uuid,
        user_id: Uuid,
        message: String,
    },
    Retry {
        quick_upload_id: Uuid,
        user_id: Uuid,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConnectorBindingJob {
    pub binding_id: Uuid,
    pub user_id: Uuid,
}
