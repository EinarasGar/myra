use rig::client::CompletionClient;

use crate::config::AiConfig;
use crate::conversation::Conversation;
use crate::conversation_provider::ConversationProvider;
use crate::models::chat::{ChatTurn, Persistence};
use crate::provider::create_gemini_client;
use crate::rate_limit_provider::RateLimitProvider;

const TITLE_SYSTEM_PROMPT: &str = r#"You are a title generator for AI conversations. Given a set of messages from a chat, create a short, descriptive title (1-5 words) that captures the main topic of the conversation.

Rules:
- Return ONLY the title, nothing else.
- Use exactly 1-5 words.
- Use title case.
- Be descriptive but concise.
- Do not include quotes, colons, or other punctuation in the title unless essential to meaning.
- Do not say "Conversation about" or similar filler.
- Do not use a generic title like "Chat" or "Conversation" — be specific to the topic.
- Do not include em dashes or ellipses; use regular hyphens if needed."#;

/// Generate a short 1-5 word title for a conversation.
///
/// Uses the same agent pattern as chat but runs ephemerally: nothing is written
/// to conversation history, while rate limiting is still enforced and recorded.
#[tracing::instrument(skip_all, fields(model = %config.model))]
pub async fn generate_conversation_title<C, R>(
    config: &AiConfig,
    conv: Conversation<C, R>,
) -> anyhow::Result<String>
where
    C: ConversationProvider,
    R: RateLimitProvider,
{
    let client = create_gemini_client(&config.api_key);
    let agent = client
        .agent(&config.model)
        .preamble(TITLE_SYSTEM_PROMPT)
        .max_tokens(32)
        .build();

    let result = conv
        .run(
            agent,
            ChatTurn::Message {
                message: "Generate a 1-5 word title for this conversation.".to_string(),
                file_ids: vec![],
            },
            Persistence::Ephemeral,
        )
        .await?;

    sanitize_title(&result.output).ok_or_else(|| anyhow::anyhow!("Generated title was empty"))
}

pub fn sanitize_title(output: &str) -> Option<String> {
    let trimmed = output.trim();
    if trimmed.is_empty() {
        return None;
    }

    let stripped = trimmed.trim_matches(['"', '\'']).trim();

    if stripped.is_empty() {
        return None;
    }

    // Take at most 5 words.
    let words: Vec<&str> = stripped.split_whitespace().take(5).collect();
    let result = words.join(" ");

    // Trim trailing `.`, `,`, `:`, `;`.
    let result = result.trim_end_matches(['.', ',', ':', ';']).to_string();

    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_trims_whitespace() {
        let result = sanitize_title("  Hello World  ").unwrap();
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_sanitize_strips_double_quotes() {
        let result = sanitize_title(r#""My Conversation Title""#).unwrap();
        assert_eq!(result, "My Conversation Title");
    }

    #[test]
    fn test_sanitize_strips_single_quotes() {
        let result = sanitize_title("'My Conversation Title'").unwrap();
        assert_eq!(result, "My Conversation Title");
    }

    #[test]
    fn test_sanitize_no_matching_quotes() {
        let result = sanitize_title(r#""Title"#).unwrap();
        assert_eq!(result, "Title");
    }

    #[test]
    fn test_sanitize_five_word_limit() {
        let result = sanitize_title("This is a five word title with extra").unwrap();
        assert_eq!(result, "This is a five word");
    }

    #[test]
    fn test_sanitize_trailing_punctuation() {
        assert_eq!(sanitize_title("Title.").unwrap(), "Title");
        assert_eq!(sanitize_title("Title,").unwrap(), "Title");
        assert_eq!(sanitize_title("Title:").unwrap(), "Title");
        assert_eq!(sanitize_title("Title;").unwrap(), "Title");
        assert_eq!(sanitize_title("Title...").unwrap(), "Title");
    }

    #[test]
    fn test_sanitize_empty_rejection() {
        assert!(sanitize_title("").is_none());
        assert!(sanitize_title("   ").is_none());
    }

    #[test]
    fn test_sanitize_quote_then_empty() {
        assert!(sanitize_title("\"\"").is_none());
        assert!(sanitize_title("''").is_none());
    }

    #[test]
    fn test_sanitize_preserves_inner_quotes() {
        let result = sanitize_title(r#""Don't Panic""#).unwrap();
        assert_eq!(result, "Don't Panic");
    }

    #[test]
    fn test_sanitize_multi_trailing_punct() {
        let result = sanitize_title("Title...").unwrap();
        assert_eq!(result, "Title");
        let result = sanitize_title("Title::").unwrap();
        assert_eq!(result, "Title");
    }
}
