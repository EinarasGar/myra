use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApiErrorResponse {
    pub error_type: ErrorType,
    pub message: String,
    pub errors: Vec<FieldError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack_trace: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<Object>)]
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ErrorType {
    NotFound,
    ValidationError,
    Unauthorized,
    Forbidden,
    Conflict,
    InternalServerError,
    ServiceUnavailable,
    RateLimited,
}
