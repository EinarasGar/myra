pub const DEFAULT_BASE_URL: &str = "https://api.enablebanking.com";
const DEFAULT_CONSENT_DAYS: i64 = 90;

pub struct EnableBankingConfig {
    pub application_id: Option<String>,
    pub private_key: Option<String>,
    pub redirect_uri_allowlist: Vec<String>,
    pub base_url: String,
    pub consent_days: i64,
}

impl EnableBankingConfig {
    pub fn get() -> &'static Self {
        static CONFIG: std::sync::OnceLock<EnableBankingConfig> = std::sync::OnceLock::new();
        CONFIG.get_or_init(Self::from_env)
    }

    fn from_env() -> Self {
        Self {
            application_id: std::env::var("ENABLEBANKING_APPLICATION_ID").ok(),
            private_key: std::env::var("ENABLEBANKING_PRIVATE_KEY")
                .ok()
                .and_then(|v| resolve_private_key(&v)),
            redirect_uri_allowlist: std::env::var("ENABLEBANKING_REDIRECT_URI_ALLOWLIST")
                .map(|v| parse_allowlist(&v))
                .unwrap_or_default(),
            base_url: std::env::var("ENABLEBANKING_BASE_URL")
                .ok()
                .filter(|v| !v.is_empty())
                .unwrap_or_else(|| DEFAULT_BASE_URL.to_string()),
            consent_days: std::env::var("ENABLEBANKING_CONSENT_DAYS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(DEFAULT_CONSENT_DAYS),
        }
    }
}

pub fn base_url() -> &'static str {
    EnableBankingConfig::get().base_url.as_str()
}

// Inline PEM values start with the PEM preamble; anything else is treated as a path to a PEM file.
// A single-line value with literal \n (or \r\n) escapes is unfolded so .env / env-var values can
// hold the PEM on one line. CRLF is normalised to LF, since PEM base64 must be LF-delimited.
fn resolve_private_key(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    let candidate = if trimmed.contains("\\n") {
        trimmed
            .replace("\\r\\n", "\n")
            .replace("\\n", "\n")
    } else {
        trimmed.to_string()
    };
    let candidate = candidate.replace("\r\n", "\n").replace('\r', "\n");
    if candidate.starts_with("-----BEGIN") {
        return Some(candidate);
    }
    match std::fs::read_to_string(trimmed) {
        Ok(pem) => Some(pem),
        Err(e) => {
            tracing::warn!(path = trimmed, error = %e, "ENABLEBANKING_PRIVATE_KEY file unreadable");
            None
        }
    }
}

fn parse_allowlist(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inline_pem_is_used_verbatim() {
        let pem = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
        assert_eq!(resolve_private_key(pem).as_deref(), Some(pem));
    }

    #[test]
    fn file_path_is_read_into_pem() {
        let dir = std::env::temp_dir();
        let path = dir.join(format!("eb_test_key_{}.pem", std::process::id()));
        std::fs::write(&path, "-----BEGIN PRIVATE KEY-----\nxyz\n-----END PRIVATE KEY-----")
            .unwrap();
        let resolved = resolve_private_key(path.to_str().unwrap()).unwrap();
        assert!(resolved.starts_with("-----BEGIN PRIVATE KEY-----"));
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn missing_file_resolves_to_none() {
        assert_eq!(resolve_private_key("/nonexistent/eb/key.pem"), None);
    }

    #[test]
    fn escaped_single_line_pem_is_unfolded() {
        let folded = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";
        let resolved = resolve_private_key(folded).unwrap();
        assert_eq!(resolved, "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----");
    }

    #[test]
    fn crlf_inline_pem_is_normalised_to_lf() {
        let crlf = "-----BEGIN PRIVATE KEY-----\r\nabc\r\n-----END PRIVATE KEY-----\r\n";
        let resolved = resolve_private_key(crlf).unwrap();
        assert_eq!(resolved, "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----");
    }

    #[test]
    fn crlf_escaped_single_line_is_unfolded() {
        let folded = "-----BEGIN PRIVATE KEY-----\\r\\nabc\\r\\n-----END PRIVATE KEY-----";
        let resolved = resolve_private_key(folded).unwrap();
        assert_eq!(resolved, "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----");
    }

    #[test]
    fn allowlist_splits_and_trims() {
        assert_eq!(
            parse_allowlist(" https://a.example/cb , https://b.example/cb ,,"),
            vec![
                "https://a.example/cb".to_string(),
                "https://b.example/cb".to_string()
            ]
        );
    }

    #[test]
    fn empty_allowlist_yields_no_entries() {
        assert!(parse_allowlist("").is_empty());
    }
}
