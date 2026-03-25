use rig::completion::message::{AssistantContent, ImageMediaType, Message};

pub(crate) fn parse_image_media_type(media_type: &str) -> Option<ImageMediaType> {
    match media_type {
        "image/jpeg" | "image/jpg" => Some(ImageMediaType::JPEG),
        "image/png" => Some(ImageMediaType::PNG),
        "image/gif" => Some(ImageMediaType::GIF),
        "image/webp" => Some(ImageMediaType::WEBP),
        _ => None,
    }
}

pub(crate) fn find_tool_call_in_history(
    history: &[Message],
    call_id: &str,
) -> Option<(String, String)> {
    for msg in history.iter().rev() {
        if let Message::Assistant { content, .. } = msg {
            for item in content.iter() {
                if let AssistantContent::ToolCall(tc) = item {
                    if tc.id == call_id || tc.call_id.as_deref() == Some(call_id) {
                        let args_str =
                            serde_json::to_string(&tc.function.arguments).unwrap_or_default();
                        return Some((tc.function.name.clone(), args_str));
                    }
                }
            }
        }
    }
    None
}
