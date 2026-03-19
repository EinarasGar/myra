#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct BusinessConflictError {
    pub message: String,
}
