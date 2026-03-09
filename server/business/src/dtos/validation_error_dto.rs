use std::fmt;

#[derive(Debug, Clone)]
pub struct BusinessValidationErrorDto {
    pub errors: Vec<BusinessFieldErrorDto>,
}

#[derive(Debug, Clone)]
pub struct BusinessFieldErrorDto {
    pub field: String,
    pub message: String,
}

impl fmt::Display for BusinessValidationErrorDto {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Validation failed: {} error(s)", self.errors.len())
    }
}

impl std::error::Error for BusinessValidationErrorDto {}
