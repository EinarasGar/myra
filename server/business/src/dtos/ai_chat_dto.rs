use ai::models::chat::{ChatHistoryMessage, ChatStreamEvent};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
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
        }
    }
}
