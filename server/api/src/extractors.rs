use axum::{
    extract::{FromRequest, FromRequestParts, Query, Request},
    http::request::Parts,
    Json,
};
use serde::de::DeserializeOwned;

use crate::errors::{ApiError, FieldError};

const DESER_PREFIX: &str =
    "Failed to deserialize the JSON body into the target type: ";

fn parse_field_error(body_text: &str) -> FieldError {
    if let Some(rest) = body_text.strip_prefix(DESER_PREFIX) {
        if let Some(field_name) = rest.strip_prefix("missing field `") {
            if let Some(end) = field_name.find('`') {
                let field = &field_name[..end];
                let message = strip_location(rest);
                return FieldError {
                    field: field.to_string(),
                    message: message.to_string(),
                };
            }
        }

        if let Some(colon_pos) = rest.find(": ") {
            let field = &rest[..colon_pos];
            if !field.contains(' ') {
                let message_with_location = &rest[colon_pos + 2..];
                let message = strip_location(message_with_location);
                return FieldError {
                    field: field.to_string(),
                    message: message.to_string(),
                };
            }
        }
    }

    FieldError {
        field: "body".to_string(),
        message: body_text.to_string(),
    }
}

fn strip_location(s: &str) -> &str {
    if let Some(pos) = s.rfind(" at line ") {
        s[..pos].trim_end()
    } else {
        s
    }
}

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
            Err(rejection) => {
                let error = parse_field_error(&rejection.body_text());
                Err(ApiError::Validation(vec![error]))
            }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_field_validation_error() {
        let input = "Failed to deserialize the JSON body into the target type: original_name: File name must be between 1 and 255 characters. at line 1 column 19";
        let error = parse_field_error(input);
        assert_eq!(error.field, "original_name");
        assert_eq!(
            error.message,
            "File name must be between 1 and 255 characters."
        );
    }

    #[test]
    fn test_parse_missing_field_error() {
        let input = "Failed to deserialize the JSON body into the target type: missing field `original_name` at line 1 column 49";
        let error = parse_field_error(input);
        assert_eq!(error.field, "original_name");
        assert_eq!(error.message, "missing field `original_name`");
    }

    #[test]
    fn test_parse_type_error() {
        let input = "Failed to deserialize the JSON body into the target type: size_bytes: invalid type: string \"not_a_number\", expected i64 at line 1 column 85";
        let error = parse_field_error(input);
        assert_eq!(error.field, "size_bytes");
        assert_eq!(
            error.message,
            "invalid type: string \"not_a_number\", expected i64"
        );
    }

    #[test]
    fn test_parse_malformed_json_fallback() {
        let input = "Failed to parse the request body as JSON: key must be a string at line 1 column 2";
        let error = parse_field_error(input);
        assert_eq!(error.field, "body");
        assert_eq!(error.message, input);
    }
}
