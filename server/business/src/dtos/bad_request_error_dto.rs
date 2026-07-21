#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct BusinessBadRequestError {
    pub message: String,
}
