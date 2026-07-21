use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncCursor {
    pub value: serde_json::Value,
}

impl SyncCursor {
    pub fn new(value: serde_json::Value) -> Self {
        Self { value }
    }

    pub fn as_value(&self) -> &serde_json::Value {
        &self.value
    }
}

#[derive(Debug, Clone)]
pub struct FetchedPage {
    pub stream: String,
    pub payload: serde_json::Value,
    pub next_cursor: Option<SyncCursor>,
}

#[derive(Debug, Clone)]
pub struct RawPage {
    pub stream: String,
    pub payload: serde_json::Value,
}
