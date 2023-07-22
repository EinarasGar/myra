use std::collections::HashMap;

use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts, Path},
    headers::{authorization::Bearer, Authorization},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json, RequestPartsExt, TypedHeader,
};

use business::{
    dtos::user_role_dto::UserRoleEnumDto, service_collection::auth_service::AuthService,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AuthenticatedUserState(pub AuthenticatedUser);

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AuthenticatedUser {
    #[serde(with = "Uuid")]
    pub user_id: Uuid,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUserState
where
    AuthService: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // Extract the token from the authorization header
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AuthError::InvalidToken)?;

        //Verify that the token is valid
        let auth_service = AuthService::from_ref(state);
        let parsed_claims = auth_service
            .verify_auth_token(bearer.token().to_string())
            .map_err(|_| AuthError::InvalidToken)?;

        //Extract user id if exists and check if it matches
        let Path(paths) = parts
            .extract::<Path<HashMap<String, String>>>()
            .await
            .unwrap();
        if parsed_claims.role != UserRoleEnumDto::Admin && paths.contains_key("user_id") {
            let user_id = paths["user_id"].to_string();
            let uuid = Uuid::parse_str(&user_id).map_err(|_| AuthError::WrongUserId)?;
            if !uuid.eq(&parsed_claims.sub) {
                return Err(AuthError::Unauthorized);
            }
        }

        let respp = AuthenticatedUser {
            user_id: parsed_claims.sub,
        };
        Ok(Self(respp))
    }
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AuthError::WrongCredentials => (StatusCode::UNAUTHORIZED, "Wrong credentials"),
            AuthError::MissingCredentials => (StatusCode::BAD_REQUEST, "Missing credentials"),
            AuthError::TokenCreation => (StatusCode::INTERNAL_SERVER_ERROR, "Token creation error"),
            AuthError::InvalidToken => (StatusCode::BAD_REQUEST, "Invalid token"),
            AuthError::WrongUserId => (StatusCode::BAD_REQUEST, "Invalid user id"),
            AuthError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized"),
        };
        let body = Json(json!({
            "error": error_message,
        }));
        (status, body).into_response()
    }
}

#[derive(Debug)]
pub enum AuthError {
    WrongCredentials,
    MissingCredentials,
    TokenCreation,
    InvalidToken,
    WrongUserId,
    Unauthorized,
}
