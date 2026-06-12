#[derive(Debug, Clone, thiserror::Error, uniffi::Error)]
pub enum ApiError {
    #[error("Network error: {reason}")]
    Network { reason: String },

    #[error("Server error (HTTP {status}): {reason}")]
    Server { reason: String, status: u16 },

    #[error("Request timed out: {reason}")]
    Timeout { reason: String },

    #[error("Failed to parse response: {reason}")]
    Parse { reason: String },
}

impl ApiError {
    pub fn is_unreachable(&self) -> bool {
        matches!(self, ApiError::Network { .. } | ApiError::Timeout { .. })
    }

    pub fn is_client_error(&self) -> bool {
        matches!(self, ApiError::Server { status, .. } if (400..500).contains(status))
    }
}

/// Build an `ApiError::Server` from a 4xx/5xx response, surfacing the backend's
/// human-readable message (and any field errors) when the body parses.
pub fn server_error(status: u16, body: &str) -> ApiError {
    let reason = serde_json::from_str::<shared::errors::ApiErrorResponse>(body)
        .ok()
        .map(|e| {
            if e.errors.is_empty() {
                e.message
            } else {
                let fields = e
                    .errors
                    .iter()
                    .map(|f| f.message.as_str())
                    .collect::<Vec<_>>()
                    .join("; ");
                if fields.is_empty() {
                    e.message
                } else {
                    format!("{}: {}", e.message, fields)
                }
            }
        })
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| format!("HTTP {status}"));
    ApiError::Server { reason, status }
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        let msg = err.to_string();
        if err.is_timeout() {
            ApiError::Timeout { reason: msg }
        } else if err.is_connect() {
            ApiError::Network { reason: msg }
        } else if let Some(status) = err.status() {
            ApiError::Server {
                reason: msg,
                status: status.as_u16(),
            }
        } else {
            ApiError::Network { reason: msg }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_error_uses_api_message() {
        let body = r#"{"error_type":"Conflict","message":"Category already exists","errors":[]}"#;
        let err = server_error(409, body);
        match err {
            ApiError::Server { reason, status } => {
                assert_eq!(status, 409);
                assert_eq!(reason, "Category already exists");
            }
            _ => panic!("expected Server error"),
        }
    }
}
