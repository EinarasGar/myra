use serde::Deserialize;

#[derive(Deserialize)]
pub struct ChatRequestViewModel {
    pub message: String,
    #[serde(default)]
    pub history: Vec<ChatMessageViewModel>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ChatRole {
    User,
    Assistant,
}

#[derive(Deserialize, Clone)]
pub struct ChatMessageViewModel {
    pub role: ChatRole,
    pub content: String,
}
