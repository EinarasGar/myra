use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{request::Parts, StatusCode},
};

use business::service_collection::{
    assets_service::AssetsService, auth_service::AuthService, portfolio_service::PortfolioService,
    transaction_service::TransactionService, users_service::UsersService,
};

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) serivces_collection: business::service_collection::Services,
}

pub struct UsersServiceState(pub UsersService);
pub struct AuthServiceState(pub AuthService);
pub struct TransactionServiceState(pub TransactionService);
pub struct PortfolioServiceState(pub PortfolioService);
pub struct AssetsServiceState(pub AssetsService);

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

impl FromRef<AppState> for TransactionService {
    fn from_ref(state: &AppState) -> Self {
        return state.serivces_collection.transaction_service.clone();
    }
}

impl FromRef<AppState> for PortfolioService {
    fn from_ref(state: &AppState) -> Self {
        return state.serivces_collection.portfolio_service.clone();
    }
}

impl FromRef<AppState> for AssetsService {
    fn from_ref(state: &AppState) -> Self {
        return state.serivces_collection.assets_service.clone();
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
impl<S> FromRequestParts<S> for AuthServiceState
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

#[async_trait]
impl<S> FromRequestParts<S> for TransactionServiceState
where
    TransactionService: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let conn = TransactionService::from_ref(state);
        Ok(Self(conn))
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for PortfolioServiceState
where
    PortfolioService: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let conn = PortfolioService::from_ref(state);
        Ok(Self(conn))
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AssetsServiceState
where
    AssetsService: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let conn = AssetsService::from_ref(state);
        Ok(Self(conn))
    }
}
