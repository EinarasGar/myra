#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct BusinessServiceUnavailableError {
    pub message: String,
}
