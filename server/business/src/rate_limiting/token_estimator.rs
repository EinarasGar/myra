use crate::dtos::ai_chat_dto::{Base64ImageDto, ChatHistoryMessageDto};

use super::constants::PER_REQUEST_INPUT_TOKEN_CAP;

const IMAGE_TOKEN_ESTIMATE: i64 = 258;

pub fn estimate_input_tokens(
    message: &Option<String>,
    images: &[Base64ImageDto],
    history: &[ChatHistoryMessageDto],
) -> i64 {
    let msg_chars = message.as_ref().map(|s| s.len()).unwrap_or(0);

    let image_tokens: i64 = images.len() as i64 * IMAGE_TOKEN_ESTIMATE;

    let history_chars: usize = history
        .iter()
        .map(|m| match m {
            ChatHistoryMessageDto::User { content }
            | ChatHistoryMessageDto::Assistant { content } => content.len(),
            ChatHistoryMessageDto::AssistantToolCall { name, args, .. } => name.len() + args.len(),
            ChatHistoryMessageDto::ToolResult { content, .. } => content.len(),
            ChatHistoryMessageDto::ToolApproval { .. } => 10,
        })
        .sum();

    (msg_chars + history_chars) as i64 / 4 + image_tokens
}

pub fn exceeds_per_request_cap(estimated_tokens: i64) -> bool {
    estimated_tokens > PER_REQUEST_INPUT_TOKEN_CAP
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimates_message_only() {
        let msg = Some("12345678901234567890".to_string());
        assert_eq!(estimate_input_tokens(&msg, &[], &[]), 5);
    }

    #[test]
    fn test_estimates_message_with_history() {
        let msg = Some("test".to_string());
        let history = vec![
            ChatHistoryMessageDto::User {
                content: "hello".to_string(),
            },
            ChatHistoryMessageDto::Assistant {
                content: "world".to_string(),
            },
        ];
        // (4 + 5 + 5) / 4 = 3
        assert_eq!(estimate_input_tokens(&msg, &[], &history), 3);
    }

    #[test]
    fn test_estimates_with_images() {
        let msg = Some("describe".to_string());
        let images = vec![
            Base64ImageDto {
                media_type: "image/png".to_string(),
                data: "base64data".to_string(),
            },
            Base64ImageDto {
                media_type: "image/jpeg".to_string(),
                data: "base64data".to_string(),
            },
        ];
        // 8 chars / 4 = 2 + 2 * 258 = 518
        assert_eq!(estimate_input_tokens(&msg, &images, &[]), 518);
    }

    #[test]
    fn test_estimates_with_tool_call_history() {
        let msg = Some("test".to_string());
        let history = vec![
            ChatHistoryMessageDto::AssistantToolCall {
                tool_call_id: "id1".to_string(),
                name: "search".to_string(),
                args: r#"{"q":"foo"}"#.to_string(),
                signature: None,
            },
            ChatHistoryMessageDto::ToolResult {
                tool_call_id: "id1".to_string(),
                content: "result data".to_string(),
            },
        ];
        // (4 + 6 + 11 + 11) / 4 = 8
        assert_eq!(estimate_input_tokens(&msg, &[], &history), 8);
    }

    #[test]
    fn test_estimates_none_message() {
        assert_eq!(estimate_input_tokens(&None, &[], &[]), 0);
    }

    #[test]
    fn test_cap_not_exceeded_at_exact_boundary() {
        assert!(!exceeds_per_request_cap(PER_REQUEST_INPUT_TOKEN_CAP));
    }

    #[test]
    fn test_cap_exceeded_above_boundary() {
        assert!(exceeds_per_request_cap(PER_REQUEST_INPUT_TOKEN_CAP + 1));
    }
}
