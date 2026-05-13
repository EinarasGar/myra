use rig::completion::message::{
    AssistantContent, DocumentMediaType, ImageMediaType, Message, MimeType, UserContent,
};

use crate::models::chat::Base64Image;

/// Map an inbound base64 attachment to a rig `UserContent` part.
///
/// Returns `None` when the MIME type isn't supported by either the image or
/// document branch — the caller decides whether to skip + log or surface an
/// error.
pub(crate) fn attachment_to_user_content(att: &Base64Image) -> Option<UserContent> {
    if let Some(mt) = ImageMediaType::from_mime_type(&att.media_type) {
        return Some(UserContent::image_base64(att.data.clone(), Some(mt), None));
    }
    if let Some(mt) = DocumentMediaType::from_mime_type(&att.media_type) {
        return Some(UserContent::document(att.data.clone(), Some(mt)));
    }
    None
}

/// Walk rig history newest-first looking for the assistant tool call that
/// produced `call_id`. Returns the tool name and serialized args, ready to
/// replay through a tool set after the user has approved/declined.
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
