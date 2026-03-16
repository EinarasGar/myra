pub enum ChatHistoryMessage {
    User(String),
    Assistant(String),
}

impl From<ChatHistoryMessage> for rig::completion::message::Message {
    fn from(msg: ChatHistoryMessage) -> Self {
        match msg {
            ChatHistoryMessage::User(content) => Self::user(&content),
            ChatHistoryMessage::Assistant(content) => Self::assistant(&content),
        }
    }
}

pub enum ChatStreamEvent {
    Text(String),
    ToolCall {
        name: String,
        input: serde_json::Value,
    },
    ToolResult {
        name: String,
        output: String,
    },
    Reasoning(String),
    Error(String),
}
