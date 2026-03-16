use rig::providers::gemini;

pub fn create_gemini_client(api_key: &str) -> gemini::Client {
    gemini::Client::new(api_key).expect("Failed to create Gemini client")
}
