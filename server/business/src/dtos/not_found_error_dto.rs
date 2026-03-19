#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct BusinessNotFoundError {
    pub message: String,
}
