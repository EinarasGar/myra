use std::fmt::Display;

use super::ApiError;

impl From<AuthError> for ApiError {
    fn from(error: AuthError) -> Self {
        match error {
            // Truly unauthenticated requests
            AuthError::WrongCredentials
            | AuthError::InvalidToken
            | AuthError::MissingCredentials => ApiError::Unauthorized,
            // Authenticated but not authorised for this resource
            AuthError::Unauthorized | AuthError::WrongUserId => ApiError::Forbidden,
            AuthError::TokenCreation => ApiError::Internal(anyhow::anyhow!("Token creation error")),
            AuthError::ServiceUnavailable => ApiError::ServiceUnavailable,
        }
    }
}

impl Display for AuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Authentication error")
    }
}

#[derive(Debug)]
pub enum AuthError {
    WrongCredentials,
    MissingCredentials,
    TokenCreation,
    InvalidToken,
    WrongUserId,
    Unauthorized,
    ServiceUnavailable,
}
