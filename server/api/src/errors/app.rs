use super::{ApiError, FieldError};

impl From<validator::ValidationErrors> for ApiError {
    fn from(errors: validator::ValidationErrors) -> Self {
        let field_errors: Vec<FieldError> = errors
            .field_errors()
            .into_iter()
            .flat_map(|(field, errs)| {
                errs.iter().map(move |e| FieldError {
                    field: field.to_string(),
                    message: e
                        .message
                        .as_ref()
                        .map(|m| m.to_string())
                        .unwrap_or_else(|| format!("Validation failed for {}", field)),
                })
            })
            .collect();
        ApiError::Validation(field_errors)
    }
}

