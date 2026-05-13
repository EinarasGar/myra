use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MyraJob {
    EmbedTransaction {
        transaction_id: Uuid,
        text: String,
    },
    EmbedTransactionGroup {
        group_id: Uuid,
        text: String,
    },
    EmbedAsset {
        asset_id: i32,
        text: String,
    },
    EmbedCategory {
        category_id: i32,
        text: String,
    },
    ProcessUploadedFile {
        file_id: Uuid,
        user_id: Uuid,
    },
    ProcessQuickUpload {
        quick_upload_id: Uuid,
        user_id: Uuid,
    },
    ProcessQuickUploadCorrection {
        quick_upload_id: Uuid,
        user_id: Uuid,
        message: String,
    },
}
