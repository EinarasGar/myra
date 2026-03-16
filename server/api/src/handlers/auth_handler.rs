use crate::auth::AuthenticatedUserState;
use crate::errors::ApiError;
use crate::states::UsersServiceState;
use axum::Json;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[cfg(feature = "database")]
use crate::extractors::ValidatedJson;
#[cfg(feature = "database")]
use crate::states::AuthServiceState;
#[cfg(feature = "database")]
use crate::view_models::authentication::auth::AuthViewModel;
#[cfg(feature = "database")]
use crate::view_models::authentication::login_details::LoginDetailsViewModel;
#[cfg(feature = "database")]
use axum::http::{header, HeaderMap};

use crate::view_models::errors::AuthResponses;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AuthMeViewModel {
    pub user_id: String,
    pub default_asset_id: i32,
    pub role: String,
    pub user_metadata: Option<UserMetadataViewModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UserMetadataViewModel {
    pub username: String,
    pub image_url: Option<String>,
}

/// Get current user
///
/// Returns the authenticated user's identity, role, and metadata.
#[utoipa::path(
    get,
    path = "/api/auth/me",
    tag = "Authentication",
    responses(
        (status = 200, description = "Current user info", body = AuthMeViewModel),
        AuthResponses
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_me(
    auth: AuthenticatedUserState,
    UsersServiceState(users_service): UsersServiceState,
) -> Result<Json<AuthMeViewModel>, ApiError> {
    #[cfg(feature = "clerk")]
    {
        let (_, _, default_asset_id) = users_service.get_basic_user(auth.0.user_id).await?;
        Ok(Json(AuthMeViewModel {
            user_id: auth.0.user_id.to_string(),
            default_asset_id,
            role: auth.0.role.unwrap_or_else(|| "User".to_string()),
            user_metadata: None,
        }))
    }
    #[cfg(not(feature = "clerk"))]
    {
        let user = users_service.get_full_user(auth.0.user_id).await?;
        Ok(Json(AuthMeViewModel {
            user_id: user.id.to_string(),
            default_asset_id: user.default_asset_id,
            role: format!("{:?}", user.role.role),
            user_metadata: Some(UserMetadataViewModel {
                username: user.username,
                image_url: None,
            }),
        }))
    }
}

/// Authenticate
///
/// Posting login details to this query will return an authentication token used in most of the requests.
#[cfg(feature = "database")]
#[utoipa::path(
    post,
    path = "/api/auth",
    tag = "Authentication",
    request_body (
      content = LoginDetailsViewModel,
    ),
    responses(
        (status = 200, description = "Authentication successful.", body = AuthViewModel),
        AuthResponses
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn post_login_details(
    AuthServiceState(auth_service): AuthServiceState,
    ValidatedJson(params): ValidatedJson<LoginDetailsViewModel>,
) -> Result<(HeaderMap, Json<AuthViewModel>), ApiError> {
    let auth = auth_service
        .get_auth_token(params.username, params.password)
        .await?;

    // Extract user_id from the JWT to create a refresh token
    let claims = auth_service.verify_auth_token(auth.clone())?;
    let (raw_refresh, expires_at) = auth_service
        .create_refresh_token(claims.sub)
        .await
        .map_err(|e| ApiError::Internal(e))?;

    let mut headers = HeaderMap::new();
    headers.insert(
        header::SET_COOKIE,
        build_refresh_cookie(&raw_refresh, expires_at)
            .parse()
            .unwrap(),
    );

    let return_model = AuthViewModel { token: auth };
    Ok((headers, Json(return_model)))
}

#[cfg(feature = "database")]
fn build_refresh_cookie(raw_token: &str, expires_at: time::OffsetDateTime) -> String {
    let max_age = (expires_at - time::OffsetDateTime::now_utc())
        .whole_seconds()
        .max(0);
    let secure = std::env::var("COOKIE_SECURE")
        .map(|v| v == "true")
        .unwrap_or(false);
    let mut cookie = format!(
        "refresh_token={}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age={}",
        raw_token, max_age
    );
    if secure {
        cookie.push_str("; Secure");
    }
    cookie
}

#[cfg(feature = "database")]
fn clear_refresh_cookie() -> String {
    let secure = std::env::var("COOKIE_SECURE")
        .map(|v| v == "true")
        .unwrap_or(false);
    let mut cookie =
        "refresh_token=; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=0".to_string();
    if secure {
        cookie.push_str("; Secure");
    }
    cookie
}

#[cfg(feature = "database")]
fn extract_refresh_token_from_cookie(headers: &HeaderMap) -> Option<String> {
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|s| s.split(';'))
        .map(|s| s.trim())
        .find_map(|cookie| cookie.strip_prefix("refresh_token=").map(|v| v.to_string()))
}

/// Refresh access token
///
/// Uses the httpOnly refresh_token cookie to issue a new access token and rotate the refresh token.
#[cfg(feature = "database")]
#[utoipa::path(
    post,
    path = "/api/auth/refresh",
    tag = "Authentication",
    responses(
        (status = 200, description = "Token refreshed successfully.", body = AuthViewModel),
        AuthResponses
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn post_refresh_token(
    headers: HeaderMap,
    AuthServiceState(auth_service): AuthServiceState,
) -> Result<(HeaderMap, Json<AuthViewModel>), ApiError> {
    let raw_token = extract_refresh_token_from_cookie(&headers).ok_or(ApiError::Unauthorized)?;

    let (user_id, new_raw_token, new_expires_at) = auth_service
        .validate_and_rotate(&raw_token)
        .await
        .map_err(|_| ApiError::Unauthorized)?;

    let access_token = auth_service
        .issue_access_token(user_id)
        .await
        .map_err(|e| ApiError::Internal(e))?;

    let mut response_headers = HeaderMap::new();
    response_headers.insert(
        header::SET_COOKIE,
        build_refresh_cookie(&new_raw_token, new_expires_at)
            .parse()
            .unwrap(),
    );

    Ok((
        response_headers,
        Json(AuthViewModel {
            token: access_token,
        }),
    ))
}

/// Refresh access token (Clerk)
///
/// Refresh endpoint is not available when using Clerk authentication.
#[cfg(feature = "clerk")]
#[utoipa::path(
    post,
    path = "/api/auth/refresh",
    tag = "Authentication",
    responses(
        (status = 404, description = "Not available under Clerk authentication."),
        AuthResponses
    )
)]
pub async fn post_refresh_token() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::NotFound(
        "Refresh endpoint is not available when using Clerk authentication".to_string(),
    ))
}

/// Refresh access token (No-auth)
///
/// Refresh endpoint is not available when authentication is disabled.
#[cfg(feature = "noauth")]
#[utoipa::path(
    post,
    path = "/api/auth/refresh",
    tag = "Authentication",
    responses(
        (status = 404, description = "Not available when authentication is disabled."),
        AuthResponses
    )
)]
pub async fn post_refresh_token() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::NotFound(
        "Refresh endpoint is not available when authentication is disabled".to_string(),
    ))
}

/// Logout
///
/// Revokes all refresh tokens for the authenticated user and clears the refresh token cookie.
#[cfg(feature = "database")]
#[utoipa::path(
    post,
    path = "/api/auth/logout",
    tag = "Authentication",
    responses(
        (status = 200, description = "Logged out successfully."),
        AuthResponses
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn post_logout(
    auth: AuthenticatedUserState,
    AuthServiceState(auth_service): AuthServiceState,
) -> Result<(HeaderMap, Json<serde_json::Value>), ApiError> {
    auth_service
        .revoke_all_refresh_tokens(auth.0.user_id)
        .await
        .map_err(|e| ApiError::Internal(e))?;

    let mut headers = HeaderMap::new();
    headers.insert(header::SET_COOKIE, clear_refresh_cookie().parse().unwrap());

    Ok((headers, Json(serde_json::json!({"message": "Logged out"}))))
}

/// Logout (Clerk)
///
/// Logout endpoint is not available when using Clerk authentication.
#[cfg(feature = "clerk")]
#[utoipa::path(
    post,
    path = "/api/auth/logout",
    tag = "Authentication",
    responses(
        (status = 404, description = "Not available under Clerk authentication."),
        AuthResponses
    )
)]
pub async fn post_logout() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::NotFound(
        "Logout endpoint is not available when using Clerk authentication".to_string(),
    ))
}

/// Logout (No-auth)
///
/// Logout endpoint is not available when authentication is disabled.
#[cfg(feature = "noauth")]
#[utoipa::path(
    post,
    path = "/api/auth/logout",
    tag = "Authentication",
    responses(
        (status = 404, description = "Not available when authentication is disabled."),
        AuthResponses
    )
)]
pub async fn post_logout() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::NotFound(
        "Logout endpoint is not available when authentication is disabled".to_string(),
    ))
}

/// Authenticate (Clerk)
///
/// Login endpoint is not available when using Clerk authentication. Login is handled client-side.
#[cfg(feature = "clerk")]
#[utoipa::path(
    post,
    path = "/api/auth",
    tag = "Authentication",
    responses(
        (status = 404, description = "Not available under Clerk authentication."),
        AuthResponses
    )
)]
pub async fn post_login_details() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::NotFound(
        "Login endpoint is not available when using Clerk authentication".to_string(),
    ))
}

/// Authenticate (No-auth)
///
/// Login endpoint is not available when authentication is disabled.
#[cfg(feature = "noauth")]
#[utoipa::path(
    post,
    path = "/api/auth",
    tag = "Authentication",
    responses(
        (status = 404, description = "Not available when authentication is disabled."),
        AuthResponses
    )
)]
pub async fn post_login_details() -> Result<Json<serde_json::Value>, ApiError> {
    Err(ApiError::NotFound(
        "Login endpoint is not available when authentication is disabled".to_string(),
    ))
}
