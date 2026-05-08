use rig::completion::message::{
    AssistantContent, Message, ToolCall, ToolFunction, ToolResultContent, UserContent,
};
use rig::OneOrMany;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone)]
pub struct Base64Image {
    pub media_type: String,
    pub data: String,
}

pub struct HistoryEntry {
    pub message: ChatHistoryMessage,
    pub file_ids: Vec<Uuid>,
}

pub struct PromptOutput {
    pub output: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ChatHistoryMessage {
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

impl From<ChatHistoryMessage> for Message {
    fn from(msg: ChatHistoryMessage) -> Self {
        match msg {
            ChatHistoryMessage::User { content } => Self::user(&content),
            ChatHistoryMessage::Assistant { content } => Self::assistant(&content),
            ChatHistoryMessage::AssistantToolCall {
                tool_call_id,
                name,
                args,
                signature,
            } => Message::Assistant {
                id: None,
                content: OneOrMany::one(AssistantContent::ToolCall(
                    ToolCall::new(
                        tool_call_id,
                        ToolFunction::new(
                            name,
                            serde_json::from_str(&args)
                                .unwrap_or(serde_json::Value::Object(Default::default())),
                        ),
                    )
                    .with_signature(Some(
                        signature.unwrap_or_else(|| "skip_thought_signature_validator".to_string()),
                    )),
                )),
            },
            ChatHistoryMessage::ToolResult {
                tool_call_id,
                content,
            } => Message::User {
                content: OneOrMany::one(UserContent::tool_result(
                    tool_call_id,
                    OneOrMany::one(ToolResultContent::text(content)),
                )),
            },
            ChatHistoryMessage::ToolApproval { .. } => {
                unreachable!("ToolApproval should be pre-processed before rig history conversion")
            }
        }
    }
}

pub struct ToolRequestPayload {
    pub tool_call_id: String,
    pub name: String,
    pub args: String,
}

pub enum ChatStreamEvent {
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
}
