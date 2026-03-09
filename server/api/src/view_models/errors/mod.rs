use crate::errors::ApiErrorResponse;
use utoipa::IntoResponses;

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
        status = 403,
        description = "Forbidden — authenticated but not authorised for this resource",
        content_type = "application/json"
    )]
    Forbidden(ApiErrorResponse),
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
        status = 422,
        description = "Validation error",
        content_type = "application/json"
    )]
    UnprocessableEntity(ApiErrorResponse),
    #[response(
        status = 401,
        description = "Unauthorized access",
        content_type = "application/json"
    )]
    Unauthorized(ApiErrorResponse),
    #[response(
        status = 403,
        description = "Forbidden — authenticated but not authorised for this resource",
        content_type = "application/json"
    )]
    Forbidden(ApiErrorResponse),
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
        status = 422,
        description = "Validation error",
        content_type = "application/json"
    )]
    UnprocessableEntity(ApiErrorResponse),
    #[response(
        status = 401,
        description = "Unauthorized access",
        content_type = "application/json"
    )]
    Unauthorized(ApiErrorResponse),
    #[response(
        status = 403,
        description = "Forbidden — authenticated but not authorised for this resource",
        content_type = "application/json"
    )]
    Forbidden(ApiErrorResponse),
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
        status = 403,
        description = "Forbidden — authenticated but not authorised for this resource",
        content_type = "application/json"
    )]
    Forbidden(ApiErrorResponse),
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
    InvalidCredentials(ApiErrorResponse),
    #[response(
        status = 500,
        description = "Internal server error",
        content_type = "application/json"
    )]
    InternalServerError(ApiErrorResponse),
}
