use ai::models::chat::{ChatHistoryMessage, ChatStreamEvent};

pub enum ChatHistoryMessageDto {
    User(String),
    Assistant(String),
}

impl From<ChatHistoryMessageDto> for ChatHistoryMessage {
    fn from(dto: ChatHistoryMessageDto) -> Self {
        match dto {
            ChatHistoryMessageDto::User(content) => ChatHistoryMessage::User(content),
            ChatHistoryMessageDto::Assistant(content) => ChatHistoryMessage::Assistant(content),
        }
    }
}

pub enum ChatStreamEventDto {
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

impl From<ChatStreamEvent> for ChatStreamEventDto {
    fn from(event: ChatStreamEvent) -> Self {
        match event {
            ChatStreamEvent::Text(text) => ChatStreamEventDto::Text(text),
            ChatStreamEvent::ToolCall { name, input } => {
                ChatStreamEventDto::ToolCall { name, input }
            }
            ChatStreamEvent::ToolResult { name, output } => {
                ChatStreamEventDto::ToolResult { name, output }
            }
            ChatStreamEvent::Reasoning(text) => ChatStreamEventDto::Reasoning(text),
            ChatStreamEvent::Error(text) => ChatStreamEventDto::Error(text),
        }
    }
}
