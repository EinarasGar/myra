use std::collections::HashMap;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;

#[cfg(any(feature = "database", feature = "clerk"))]
use axum::extract::FromRef;

#[cfg(any(feature = "database", feature = "clerk"))]
use axum::RequestPartsExt;

#[cfg(any(feature = "database", feature = "clerk"))]
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};

#[cfg(any(feature = "database", feature = "clerk"))]
use business::{dtos::auth_dto::ClaimsDto, service_collection::auth_service::AuthService};

use uuid::Uuid;

#[cfg(any(feature = "database", feature = "clerk"))]
use business::dtos::user_role_dto::UserRoleEnumDto;

#[cfg(any(feature = "database", feature = "clerk"))]
use crate::errors::auth::AuthError;
use crate::errors::ApiError;

/// The authenticated user, inserted into request extensions by the `authenticate`
/// middleware. Available on all authenticated routes.
#[derive(Clone, Debug)]
pub struct AuthenticatedUser {
    pub user_id: Uuid,
    #[cfg(any(feature = "database", feature = "clerk"))]
    pub role: UserRoleEnumDto,
    pub username: Option<String>,
}

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthenticatedUser>()
            .cloned()
            .ok_or(ApiError::Unauthorized)
    }
}

/// A validated user ID extracted from the URL path and checked against the
/// authenticated user by the `enforce_user_ownership` middleware.
/// This is the ONLY way handlers should obtain a user_id for user-scoped routes.
#[derive(Clone, Debug)]
pub struct AuthenticatedUserId(pub Uuid);

impl<S> FromRequestParts<S> for AuthenticatedUserId
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthenticatedUserId>()
            .cloned()
            .ok_or(ApiError::Unauthorized)
    }
}

pub(crate) fn extract_path_user_id(paths: &HashMap<String, String>) -> Result<Uuid, ApiError> {
    let user_id_str = paths
        .get("user_id")
        .ok_or_else(|| ApiError::BadRequest("Missing user_id path parameter".to_string()))?;
    Uuid::parse_str(user_id_str)
        .map_err(|_| -> ApiError { ApiError::BadRequest("Invalid user_id".to_string()) })
}

#[cfg(feature = "database")]
pub(crate) async fn extract_database_claims<S>(
    parts: &mut Parts,
    state: &S,
) -> Result<ClaimsDto, ApiError>
where
    AuthService: FromRef<S>,
    S: Send + Sync,
{
    let TypedHeader(Authorization(bearer)) = parts
        .extract::<TypedHeader<Authorization<Bearer>>>()
        .await
        .map_err(|_| -> ApiError { AuthError::InvalidToken.into() })?;

    let auth_service = AuthService::from_ref(state);
    auth_service
        .verify_auth_token(bearer.token().to_string())
        .map_err(|_| -> ApiError { AuthError::InvalidToken.into() })
}

#[cfg(feature = "clerk")]
pub(crate) async fn extract_clerk_claims<S>(
    parts: &mut Parts,
    state: &S,
) -> Result<ClaimsDto, ApiError>
where
    AuthService: FromRef<S>,
    S: Send + Sync,
{
    let TypedHeader(Authorization(bearer)) = parts
        .extract::<TypedHeader<Authorization<Bearer>>>()
        .await
        .map_err(|_| -> ApiError { AuthError::InvalidToken.into() })?;

    let auth_service = AuthService::from_ref(state);
    auth_service
        .verify_clerk_token(bearer.token().to_string())
        .await
        .map_err(|e| -> ApiError {
            tracing::error!("Clerk token verification failed: {}", e);
            if e.to_string().contains("Failed to fetch Clerk JWKS") {
                AuthError::ServiceUnavailable.into()
            } else {
                AuthError::InvalidToken.into()
            }
        })
}
