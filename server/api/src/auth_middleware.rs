use axum::{
    extract::{Path, Request},
    middleware::Next,
    response::Response,
};
use std::collections::HashMap;

use crate::auth::{extract_path_user_id, AuthenticatedUser, AuthenticatedUserId};
use crate::errors::ApiError;

#[cfg(any(feature = "database", feature = "clerk"))]
use axum::extract::State;

#[cfg(any(feature = "database", feature = "clerk"))]
use crate::states::AppState;

// ---------------------------------------------------------------------------
// authenticate — global middleware that validates the token and inserts
// AuthenticatedUser into request extensions. Applied to all non-public routes.
// ---------------------------------------------------------------------------

#[cfg(feature = "noauth")]
pub async fn authenticate(mut request: Request, next: Next) -> Result<Response, ApiError> {
    use uuid::Uuid;
    request.extensions_mut().insert(AuthenticatedUser {
        user_id: Uuid::nil(),
        username: None,
    });
    Ok(next.run(request).await)
}

#[cfg(feature = "database")]
pub async fn authenticate(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    use crate::auth::extract_database_claims;

    let (mut parts, body) = request.into_parts();
    let claims = extract_database_claims(&mut parts, &state).await?;

    parts.extensions.insert(AuthenticatedUser {
        user_id: claims.sub,
        role: claims.role,
        username: Some(claims.username),
    });

    let request = Request::from_parts(parts, body);
    Ok(next.run(request).await)
}

#[cfg(feature = "clerk")]
pub async fn authenticate(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    use crate::auth::extract_clerk_claims;

    let (mut parts, body) = request.into_parts();
    let claims = extract_clerk_claims(&mut parts, &state).await?;

    parts.extensions.insert(AuthenticatedUser {
        user_id: claims.sub,
        role: claims.role,
        username: Some(claims.username),
    });

    let request = Request::from_parts(parts, body);
    Ok(next.run(request).await)
}

// ---------------------------------------------------------------------------
// enforce_user_ownership — applied to user-scoped routes nested under
// /api/users/{user_id}. Reads the already-authenticated user from extensions,
// validates the path user_id matches, and inserts AuthenticatedUserId.
// ---------------------------------------------------------------------------

pub async fn enforce_user_ownership(request: Request, next: Next) -> Result<Response, ApiError> {
    use axum::RequestPartsExt;

    let (mut parts, body) = request.into_parts();

    let Path(paths) = parts
        .extract::<Path<HashMap<String, String>>>()
        .await
        .map_err(|_| ApiError::BadRequest("Invalid path parameters".to_string()))?;
    let path_user_id = extract_path_user_id(&paths)?;

    #[cfg(any(feature = "database", feature = "clerk"))]
    {
        use business::dtos::user_role_dto::UserRoleEnumDto;

        let auth_user = parts
            .extensions
            .get::<AuthenticatedUser>()
            .ok_or(ApiError::Unauthorized)?;
        if auth_user.role != UserRoleEnumDto::Admin && path_user_id != auth_user.user_id {
            return Err(ApiError::Forbidden);
        }
    }

    parts.extensions.insert(AuthenticatedUserId(path_user_id));
    let request = Request::from_parts(parts, body);
    Ok(next.run(request).await)
}
