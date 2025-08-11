use serde::{Deserialize, Serialize};
use utoipa::{IntoResponses, ToSchema};

/// Standard error response structure
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ApiErrorResponse {
    /// Error message describing what went wrong
    #[schema(example = "Resource not found")]
    pub error: String,
    /// HTTP status code
    #[schema(example = 404)]
    pub status: u16,
    /// Optional error code for client-side handling
    #[schema(example = "RESOURCE_NOT_FOUND")]
    pub code: Option<String>,
}

/// Validation error response for request validation failures
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ValidationErrorResponse {
    /// General error message
    #[schema(example = "Validation failed")]
    pub error: String,
    /// HTTP status code
    #[schema(example = 422)]
    pub status: u16,
    /// Detailed field validation errors
    pub details: Vec<ValidationError>,
}

/// Individual field validation error
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ValidationError {
    /// Field name that failed validation
    #[schema(example = "amount")]
    pub field: String,
    /// Validation error message
    #[schema(example = "Amount must be greater than zero")]
    pub message: String,
    /// Error code for programmatic handling
    #[schema(example = "POSITIVE_NUMBER_REQUIRED")]
    pub code: Option<String>,
}

/// Authentication error response
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AuthErrorResponse {
    /// Authentication error message
    #[schema(example = "Invalid credentials")]
    pub error: String,
    /// HTTP status code
    #[schema(example = 401)]
    pub status: u16,
    /// Authentication error code
    #[schema(example = "INVALID_CREDENTIALS")]
    pub code: String,
}

#[allow(dead_code)]
impl ApiErrorResponse {
    pub fn new(error: impl Into<String>, status: u16, code: Option<String>) -> Self {
        Self {
            error: error.into(),
            status,
            code,
        }
    }

    pub fn not_found(resource: impl Into<String>) -> Self {
        Self::new(
            format!("{} not found", resource.into()),
            404,
            Some("RESOURCE_NOT_FOUND".to_string()),
        )
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(message, 400, Some("BAD_REQUEST".to_string()))
    }

    pub fn unauthorized() -> Self {
        Self::new("Unauthorized access", 401, Some("UNAUTHORIZED".to_string()))
    }

    pub fn forbidden() -> Self {
        Self::new("Access forbidden", 403, Some("FORBIDDEN".to_string()))
    }

    pub fn internal_server_error() -> Self {
        Self::new(
            "Internal server error",
            500,
            Some("INTERNAL_SERVER_ERROR".to_string()),
        )
    }
}

#[allow(dead_code)]
impl ValidationErrorResponse {
    pub fn new(details: Vec<ValidationError>) -> Self {
        Self {
            error: "Validation failed".to_string(),
            status: 422,
            details,
        }
    }
}

#[allow(dead_code)]
impl AuthErrorResponse {
    pub fn invalid_credentials() -> Self {
        Self {
            error: "Invalid credentials provided".to_string(),
            status: 401,
            code: "INVALID_CREDENTIALS".to_string(),
        }
    }

    pub fn token_expired() -> Self {
        Self {
            error: "Authentication token has expired".to_string(),
            status: 401,
            code: "TOKEN_EXPIRED".to_string(),
        }
    }

    pub fn token_invalid() -> Self {
        Self {
            error: "Invalid authentication token".to_string(),
            status: 401,
            code: "TOKEN_INVALID".to_string(),
        }
    }
}

/// Common error responses for GET endpoints (retrieve operations)
#[allow(dead_code)]
#[derive(IntoResponses)]
pub enum GetResponses {
    #[response(
        status = 401,
        description = "Unauthorized access",
        content_type = "application/json"
    )]
    Unauthorized(ApiErrorResponse),
    #[response(
        status = 404,
        description = "Resource not found",
        content_type = "application/json"
    )]
    NotFound(ApiErrorResponse),
    #[response(
        status = 500,
        description = "Internal server error",
        content_type = "application/json"
    )]
    InternalServerError(ApiErrorResponse),
}

/// Common error responses for POST endpoints (create operations)
#[allow(dead_code)]
#[derive(IntoResponses)]
pub enum CreateResponses {
    #[response(
        status = 400,
        description = "Bad request",
        content_type = "application/json"
    )]
    BadRequest(ApiErrorResponse),
    #[response(
        status = 401,
        description = "Unauthorized access",
        content_type = "application/json"
    )]
    Unauthorized(ApiErrorResponse),
    #[response(
        status = 422,
        description = "Validation error",
        content_type = "application/json"
    )]
    ValidationError(ValidationErrorResponse),
    #[response(
        status = 500,
        description = "Internal server error",
        content_type = "application/json"
    )]
    InternalServerError(ApiErrorResponse),
}

/// Common error responses for PUT endpoints (update operations)
#[allow(dead_code)]
#[derive(IntoResponses)]
pub enum UpdateResponses {
    #[response(
        status = 400,
        description = "Bad request",
        content_type = "application/json"
    )]
    BadRequest(ApiErrorResponse),
    #[response(
        status = 401,
        description = "Unauthorized access",
        content_type = "application/json"
    )]
    Unauthorized(ApiErrorResponse),
    #[response(
        status = 404,
        description = "Resource not found",
        content_type = "application/json"
    )]
    NotFound(ApiErrorResponse),
    #[response(
        status = 422,
        description = "Validation error",
        content_type = "application/json"
    )]
    ValidationError(ValidationErrorResponse),
    #[response(
        status = 500,
        description = "Internal server error",
        content_type = "application/json"
    )]
    InternalServerError(ApiErrorResponse),
}

/// Common error responses for DELETE endpoints (delete operations)
#[allow(dead_code)]
#[derive(IntoResponses)]
pub enum DeleteResponses {
    #[response(
        status = 401,
        description = "Unauthorized access",
        content_type = "application/json"
    )]
    Unauthorized(ApiErrorResponse),
    #[response(
        status = 404,
        description = "Resource not found",
        content_type = "application/json"
    )]
    NotFound(ApiErrorResponse),
    #[response(
        status = 500,
        description = "Internal server error",
        content_type = "application/json"
    )]
    InternalServerError(ApiErrorResponse),
}

/// Authentication-specific error responses
#[allow(dead_code)]
#[derive(IntoResponses)]
pub enum AuthResponses {
    #[response(
        status = 401,
        description = "Invalid credentials",
        content_type = "application/json"
    )]
    InvalidCredentials(AuthErrorResponse),
    #[response(
        status = 422,
        description = "Validation error",
        content_type = "application/json"
    )]
    ValidationError(ValidationErrorResponse),
    #[response(
        status = 500,
        description = "Internal server error",
        content_type = "application/json"
    )]
    InternalServerError(ApiErrorResponse),
}
