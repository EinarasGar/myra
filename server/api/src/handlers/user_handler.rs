use axum::extract::Path;
use axum::Json;
use uuid::Uuid;

use crate::auth::AuthenticatedUser;
use crate::errors::ApiError;

use crate::extractors::ValidatedJson;
use crate::states::UsersServiceState;

#[cfg(feature = "database")]
use serde::Serialize;
#[cfg(feature = "database")]
use utoipa::ToSchema;

#[cfg(feature = "database")]
use crate::view_models::users::add_user_view_model::AddUserViewModel;
use shared::view_models::users::set_base_asset_view_model::SetBaseAssetRequestViewModel;
use shared::view_models::users::set_onboarding_view_model::SetOnboardingVersionRequestViewModel;

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
#[tracing::instrument(level = "info", skip_all)]
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

#[utoipa::path(
    post,
    path = "/api/users/{user_id}/base-asset",
    tag = "Users",
    params(("user_id" = String, Path, description = "Id of the user.")),
    request_body(content = SetBaseAssetRequestViewModel),
    responses((status = 200, description = "Base asset updated."))
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn post_base_asset(
    _auth: AuthenticatedUser,
    Path(user_id): Path<Uuid>,
    UsersServiceState(users_service): UsersServiceState,
    ValidatedJson(params): ValidatedJson<SetBaseAssetRequestViewModel>,
) -> Result<Json<serde_json::Value>, ApiError> {
    users_service
        .set_default_asset(user_id, params.asset_id)
        .await?;
    Ok(Json(serde_json::json!({})))
}

#[utoipa::path(
    post,
    path = "/api/users/{user_id}/onboarding",
    tag = "Users",
    params(("user_id" = String, Path, description = "Id of the user.")),
    request_body(content = SetOnboardingVersionRequestViewModel),
    responses((status = 200, description = "Onboarding version updated."))
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn post_onboarding(
    _auth: AuthenticatedUser,
    Path(user_id): Path<Uuid>,
    UsersServiceState(users_service): UsersServiceState,
    ValidatedJson(params): ValidatedJson<SetOnboardingVersionRequestViewModel>,
) -> Result<Json<serde_json::Value>, ApiError> {
    users_service
        .set_onboarding_version(user_id, params.version)
        .await?;
    Ok(Json(serde_json::json!({})))
}
