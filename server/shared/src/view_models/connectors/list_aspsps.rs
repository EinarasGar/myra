use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[cfg(feature = "backend")]
use crate::view_models::transactions::validation::Validatable;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AspspViewModel {
    pub name: String,
    pub country: String,
}

#[derive(Clone, Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ListAspspsQuery {
    pub country: String,
}

#[cfg(feature = "backend")]
impl Validatable for ListAspspsQuery {
    fn validate(&self) -> Result<(), Vec<crate::errors::FieldError>> {
        let country = self.country.to_uppercase();
        if country.len() != 2 || !country.chars().all(|c| c.is_ascii_alphabetic()) {
            return Err(vec![crate::errors::FieldError {
                field: "country".to_string(),
                message: "country must be a two-letter ISO 3166-1 alpha-2 code".to_string(),
            }]);
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ListAspspsResponseViewModel {
    pub aspsps: Vec<AspspViewModel>,
}
