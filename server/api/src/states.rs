use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{request::Parts, StatusCode},
};

use business::service_collection::{auth_service::AuthService, users_service::UsersService};

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) serivces_collection: business::service_collection::Services,
}

pub struct UsersServiceState(pub UsersService);
pub struct AuthenticationServiceState(pub AuthService);

impl FromRef<AppState> for UsersService {
    fn from_ref(state: &AppState) -> Self {
        return state.serivces_collection.users_service.clone();
    }
}

impl FromRef<AppState> for AuthService {
    fn from_ref(state: &AppState) -> Self {
        return state.serivces_collection.auth_service.clone();
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for UsersServiceState
where
    UsersService: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let conn = UsersService::from_ref(state);
        Ok(Self(conn))
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticationServiceState
where
    AuthService: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let conn = AuthService::from_ref(state);
        Ok(Self(conn))
    }
}
