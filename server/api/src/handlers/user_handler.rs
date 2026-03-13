use axum::Json;

use crate::errors::ApiError;

#[cfg(feature = "database")]
use serde::Serialize;
#[cfg(feature = "database")]
use utoipa::ToSchema;

#[cfg(feature = "database")]
use crate::{
    extractors::ValidatedJson,
    states::UsersServiceState,
    view_models::users::add_user_view_model::AddUserViewModel,
};

#[cfg(feature = "database")]
#[derive(Debug, Serialize, ToSchema)]
pub struct RegisteredUserViewModel {
    pub id: String,
    pub username: String,
}

/// Register a new user
///
/// Creates a new user account with the provided username and password.
#[cfg(feature = "database")]
#[utoipa::path(
    post,
    path = "/api/users",
    tag = "Users",
    request_body(content = AddUserViewModel),
    responses(
        (status = 200, description = "User registered successfully.", body = RegisteredUserViewModel),
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn post_user(
    UsersServiceState(users_service): UsersServiceState,
    ValidatedJson(params): ValidatedJson<AddUserViewModel>,
) -> Result<Json<RegisteredUserViewModel>, ApiError> {
    let user = users_service.register_user(params.into()).await?;
    Ok(Json(RegisteredUserViewModel {
        id: user.id.to_string(),
        username: user.username,
    }))
}

/// Register a new user
///
/// User registration is not available under this authentication provider.
#[cfg(not(feature = "database"))]
#[utoipa::path(
    post,
    path = "/api/users",
    tag = "Users",
    responses(
        (status = 404, description = "Not available under this authentication provider."),
    )
)]
pub async fn post_user() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::NotFound(
        "User registration is not available under this authentication provider".to_string(),
    ))
}
