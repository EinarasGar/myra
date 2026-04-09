use serde::Deserialize;

#[derive(Deserialize, Clone)]
pub struct ChatImageViewModel {
    pub media_type: String,
    pub data: String,
}

#[derive(Deserialize)]
pub struct ChatRequestViewModel {
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub images: Vec<ChatImageViewModel>,
    #[serde(default)]
    pub history: Vec<ChatMessageViewModel>,
}

#[derive(Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ChatMessageViewModel {
    User {
        content: String,
    },
    Assistant {
        content: String,
    },
    AssistantToolCall {
        tool_call_id: String,
        name: String,
        args: String,
        #[serde(default)]
        signature: Option<String>,
    },
    ToolResult {
        tool_call_id: String,
        content: String,
    },
    ToolApproval {
        tool_call_id: String,
        approved: bool,
    },
}
