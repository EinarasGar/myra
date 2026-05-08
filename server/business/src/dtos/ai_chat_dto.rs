use ai::models::chat::{ChatHistoryMessage, ChatStreamEvent};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ChatHistoryMessageDto {
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
        #[serde(default, skip_serializing_if = "Option::is_none")]
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

impl ChatHistoryMessageDto {
    pub fn role(&self) -> &'static str {
        match self {
            Self::User { .. } => "user",
            Self::Assistant { .. } => "assistant",
            Self::AssistantToolCall { .. } => "tool_call",
            Self::ToolResult { .. } => "tool_result",
            Self::ToolApproval { .. } => "tool_approval",
        }
    }
}

impl From<ChatHistoryMessage> for ChatHistoryMessageDto {
    fn from(msg: ChatHistoryMessage) -> Self {
        match msg {
            ChatHistoryMessage::User { content } => Self::User { content },
            ChatHistoryMessage::Assistant { content } => Self::Assistant { content },
            ChatHistoryMessage::AssistantToolCall {
                tool_call_id,
                name,
                args,
                signature,
            } => Self::AssistantToolCall {
                tool_call_id,
                name,
                args,
                signature,
            },
            ChatHistoryMessage::ToolResult {
                tool_call_id,
                content,
            } => Self::ToolResult {
                tool_call_id,
                content,
            },
            ChatHistoryMessage::ToolApproval {
                tool_call_id,
                approved,
            } => Self::ToolApproval {
                tool_call_id,
                approved,
            },
        }
    }
}

impl From<ChatHistoryMessageDto> for ChatHistoryMessage {
    fn from(dto: ChatHistoryMessageDto) -> Self {
        match dto {
            ChatHistoryMessageDto::User { content } => ChatHistoryMessage::User { content },
            ChatHistoryMessageDto::Assistant { content } => {
                ChatHistoryMessage::Assistant { content }
            }
            ChatHistoryMessageDto::AssistantToolCall {
                tool_call_id,
                name,
                args,
                signature,
            } => ChatHistoryMessage::AssistantToolCall {
                tool_call_id,
                name,
                args,
                signature,
            },
            ChatHistoryMessageDto::ToolResult {
                tool_call_id,
                content,
            } => ChatHistoryMessage::ToolResult {
                tool_call_id,
                content,
            },
            ChatHistoryMessageDto::ToolApproval {
                tool_call_id,
                approved,
            } => ChatHistoryMessage::ToolApproval {
                tool_call_id,
                approved,
            },
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Base64ImageDto {
    pub media_type: String,
    pub data: String,
}

impl From<(String, String)> for Base64ImageDto {
    fn from((media_type, data): (String, String)) -> Self {
        Self { media_type, data }
    }
}

#[derive(Debug, Clone)]
pub enum ChatStreamEventDto {
    Text(String),
    ToolCall {
        call_id: String,
        name: String,
        input: serde_json::Value,
        signature: Option<String>,
    },
    ToolResult {
        name: String,
        output: String,
    },
    Reasoning(String),
    Error(String),
    ToolRequest {
        tool_call_id: String,
        name: String,
        args: serde_json::Value,
    },
    Usage {
        input_tokens: u64,
        output_tokens: u64,
    },
    Done,
}

impl From<ChatStreamEvent> for ChatStreamEventDto {
    fn from(event: ChatStreamEvent) -> Self {
        match event {
            ChatStreamEvent::Text(text) => ChatStreamEventDto::Text(text),
            ChatStreamEvent::ToolCall {
                call_id,
                name,
                input,
                signature,
            } => ChatStreamEventDto::ToolCall {
                call_id,
                name,
                input,
                signature,
            },
            ChatStreamEvent::ToolResult { name, output } => {
                ChatStreamEventDto::ToolResult { name, output }
            }
            ChatStreamEvent::Reasoning(text) => ChatStreamEventDto::Reasoning(text),
            ChatStreamEvent::Error(text) => ChatStreamEventDto::Error(text),
            ChatStreamEvent::ToolRequest {
                tool_call_id,
                name,
                args,
            } => ChatStreamEventDto::ToolRequest {
                tool_call_id,
                name,
                args,
            },
            ChatStreamEvent::Usage {
                input_tokens,
                output_tokens,
            } => ChatStreamEventDto::Usage {
                input_tokens,
                output_tokens,
            },
        }
    }
}
