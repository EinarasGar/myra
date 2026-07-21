#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct BusinessBadGatewayError {
    pub message: String,
}
