use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use business::dtos::validation_error_dto::BusinessValidationErrorDto;

pub mod app;
pub mod auth;

pub use shared::errors::{ApiErrorResponse, ErrorType, FieldError};

impl From<Vec<FieldError>> for ApiError {
    fn from(errors: Vec<FieldError>) -> Self {
        ApiError::Validation(errors)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Validation failed")]
    Validation(Vec<FieldError>),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Service unavailable")]
    ServiceUnavailable,

    #[error("Rate limit exceeded")]
    RateLimited(serde_json::Value),

    #[error("{0}")]
    Internal(#[from] anyhow::Error),
}

impl ApiError {
    /// Converts an `anyhow::Error` into an `ApiError`, surfacing
    /// `BusinessValidationErrorDto` as a structured 422 response
    /// instead of a generic 500.
    pub fn from_anyhow(err: anyhow::Error) -> Self {
        if let Some(val_err) = err.downcast_ref::<BusinessValidationErrorDto>() {
            ApiError::Validation(
                val_err
                    .errors
                    .iter()
                    .map(|e| FieldError {
                        field: e.field.clone(),
                        message: e.message.clone(),
                    })
                    .collect(),
            )
        } else if let Some(not_found_err) =
            err.downcast_ref::<business::dtos::not_found_error_dto::BusinessNotFoundError>()
        {
            ApiError::NotFound(not_found_err.message.clone())
        } else if let Some(conflict_err) =
            err.downcast_ref::<business::dtos::conflict_error_dto::BusinessConflictError>()
        {
            ApiError::Conflict(conflict_err.message.clone())
        } else if err
            .downcast_ref::<business::dtos::service_unavailable_error_dto::BusinessServiceUnavailableError>()
            .is_some()
        {
            ApiError::ServiceUnavailable
        } else {
            ApiError::Internal(err)
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_type, message, errors, details) = match &self {
            ApiError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                ErrorType::ValidationError,
                msg.clone(),
                vec![],
                None,
            ),
            ApiError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                ErrorType::NotFound,
                msg.clone(),
                vec![],
                None,
            ),
            ApiError::Validation(field_errors) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorType::ValidationError,
                "One or more fields failed validation.".to_string(),
                field_errors.clone(),
                None,
            ),
            ApiError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                ErrorType::Unauthorized,
                "Unauthorized".to_string(),
                vec![],
                None,
            ),
            ApiError::Forbidden => (
                StatusCode::FORBIDDEN,
                ErrorType::Forbidden,
                "Forbidden".to_string(),
                vec![],
                None,
            ),
            ApiError::Conflict(msg) => (
                StatusCode::CONFLICT,
                ErrorType::Conflict,
                msg.clone(),
                vec![],
                None,
            ),
            ApiError::ServiceUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                ErrorType::ServiceUnavailable,
                "Service temporarily unavailable.".to_string(),
                vec![],
                None,
            ),
            ApiError::RateLimited(details) => (
                StatusCode::TOO_MANY_REQUESTS,
                ErrorType::RateLimited,
                "Rate limit exceeded.".to_string(),
                vec![],
                Some(details.clone()),
            ),
            ApiError::Internal(_err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorType::InternalServerError,
                "An internal server error occurred.".to_string(),
                vec![],
                None,
            ),
        };

        let stack_trace = if cfg!(debug_assertions) {
            match &self {
                ApiError::Internal(err) => Some(format!("{:?}", err)),
                _ => None,
            }
        } else {
            None
        };

        let body = ApiErrorResponse {
            error_type,
            message,
            errors,
            stack_trace,
            details,
        };

        (status, Json(body)).into_response()
    }
}

impl From<business::dtos::ai_chat_error_dto::AiChatError> for ApiError {
    fn from(err: business::dtos::ai_chat_error_dto::AiChatError) -> Self {
        use business::dtos::ai_chat_error_dto::AiChatError;
        match err {
            AiChatError::RateLimited(rl) => ApiError::RateLimited(serde_json::json!({
                "reason": "quota_exceeded",
                "window": rl.window.to_string(),
                "token_type": rl.token_type.to_string(),
                "scope": rl.scope.to_string(),
                "limit": rl.limit,
                "remaining": rl.remaining,
                "reset_at": rl.reset_at
                    .format(&time::format_description::well_known::Rfc3339)
                    .unwrap_or_default(),
            })),
            AiChatError::PerRequestInputLimit => ApiError::RateLimited(serde_json::json!({
                "reason": "per_request_input_limit",
            })),
            AiChatError::ConcurrencyLimitExceeded => ApiError::RateLimited(serde_json::json!({
                "reason": "concurrency_limit",
                "scope": "user",
            })),
            AiChatError::Internal(e) => ApiError::from_anyhow(e),
        }
    }
}
