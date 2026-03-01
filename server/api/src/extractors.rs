use axum::{
    extract::{FromRequest, FromRequestParts, Query, Request},
    http::request::Parts,
    Json,
};
use serde::de::DeserializeOwned;

use crate::errors::{ApiError, FieldError};

pub struct ValidatedJson<T>(pub T);

impl<S, T> FromRequest<S> for ValidatedJson<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        match Json::<T>::from_request(req, state).await {
            Ok(Json(value)) => Ok(ValidatedJson(value)),
            Err(rejection) => Err(ApiError::Validation(vec![FieldError {
                field: "body".to_string(),
                message: rejection.body_text(),
            }])),
        }
    }
}

pub struct ValidatedQuery<T>(pub T);

impl<S, T> FromRequestParts<S> for ValidatedQuery<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match Query::<T>::from_request_parts(parts, state).await {
            Ok(Query(value)) => Ok(ValidatedQuery(value)),
            Err(rejection) => Err(ApiError::Validation(vec![FieldError {
                field: "query".to_string(),
                message: rejection.body_text(),
            }])),
        }
    }
}
