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
