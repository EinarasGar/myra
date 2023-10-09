use axum::response::{IntoResponse, Response};

use self::{app::AppError, auth::AuthError};

pub mod app;
pub mod auth;

#[derive(Debug)]
pub enum ApiError {
    AppError(AppError),
    AuthError(AuthError),
}

// Tell axum how to convert `AppError` into a response.
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::AppError(app_error) => app_error.into_response(),
            ApiError::AuthError(auth_error) => auth_error.into_response(),
        }
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApiError::AppError(app_error) => write!(f, "App Error: {}", app_error),
            ApiError::AuthError(auth_error) => write!(f, "Auth Error: {}", auth_error),
        }
    }
}
