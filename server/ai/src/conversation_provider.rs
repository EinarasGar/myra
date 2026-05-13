use anyhow::Result;
use uuid::Uuid;

pub use crate::models::chat::HistoryEntry;
use crate::models::chat::{Base64Image, ChatHistoryMessage};

pub trait ConversationProvider: Send + Sync + 'static {
    /// Load prior turns in oldest-to-newest order. File attachments are
    /// returned as ids only — the wrapper batch-resolves them via `fetch_images`.
    fn load_history(&self) -> impl std::future::Future<Output = Result<Vec<HistoryEntry>>> + Send;

    /// Resolve a set of file ids into base64-encoded images. Called by the
    /// wrapper for both historical and current-turn attachments.
    fn fetch_images(
        &self,
        file_ids: &[Uuid],
    ) -> impl std::future::Future<Output = Result<Vec<Base64Image>>> + Send;

    /// Persist the user's input turn, including file attachment ids.
    fn record_user_message(
        &self,
        content: String,
        file_ids: &[Uuid],
    ) -> impl std::future::Future<Output = Result<()>> + Send;

    /// Persist a message emitted by the agent.
    fn append_message(
        &self,
        message: ChatHistoryMessage,
    ) -> impl std::future::Future<Output = Result<()>> + Send;
}
