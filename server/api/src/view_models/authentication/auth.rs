use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({"token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyMzk2NDgwZi0wMDUyLTRjZjAtODFkYy04Y2VkYmRlNWNlMTMiLCJyb2xlIjoiQWRtaW4iLCJleHAiOjE3MDg4MTYxNzV9.bMzXp5J-_xEmOZE63Ffo0KsCIa4cqDw7Ry4fhWpWyRw","refresh_token":"a1b2c3d4e5f6"}))]
pub struct AuthViewModel {
    /// The JWT bearer authentication token.
    pub token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
}
