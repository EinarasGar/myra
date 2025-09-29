use std::fmt::{Debug, Display};

use anyhow;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

use super::ApiError;

impl From<anyhow::Error> for ApiError {
    fn from(error: anyhow::Error) -> Self {
        ApiError::AppError(AppError(error))
    }
}

impl From<validator::ValidationErrors> for ApiError {
    fn from(errors: validator::ValidationErrors) -> Self {
        ApiError::AppError(AppError(anyhow::anyhow!("Validation failed: {}", errors)))
    }
}

// Make our own error that wraps `anyhow::Error`.
pub struct AppError(anyhow::Error);

// Tell axum how to convert `AppError` into a response.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Something went wrong: {:?}", self.0),
        )
            .into_response()
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Something went wrong: {}", self.0)
    }
}

impl Debug for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("AppError").field(&self.0).finish()
    }
}

// This enables using `?` on functions that return `Result<_, anyhow::Error>` to turn them into
// `Result<_, AppError>`. That way you don't need to do that manually.
impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

//https://github.com/rust-lang/rust/issues/79676
// Split backtrace into frames, remove frames from Rust internals.
// Otherwise, backtraces are mostly the panic system's internals and won't fit.
// This is very dependent on the format of backtrace output.
// It looks for the number: at the beginning of each frame.
//
// This is a workaround for https://github.com/rust-lang/rust/issues/79676
// fn trim_backtrace(s: &str) -> Vec<&str> {
//     let splitter = Regex::new(r"(^|\n)\s+\d+:").unwrap();
//     splitter
//         .split(s)
//         .filter(|frame| !frame.contains("/rustc/") && !frame.is_empty())
//         .collect() // split frames
// }
