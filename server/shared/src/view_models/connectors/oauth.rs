use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[cfg(feature = "backend")]
use crate::view_models::transactions::validation::Validatable;

use super::base_models::ConnectorConnectionViewModel;

#[derive(Clone, Debug, Default, Serialize, Deserialize, ToSchema)]
pub struct BankSelectionViewModel {
    pub bank_name: Option<String>,
    pub bank_country: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateOAuthSessionRequestViewModel {
    pub redirect_uri: Option<String>,
    pub bank_name: Option<String>,
    pub bank_country: Option<String>,
}

#[cfg(feature = "backend")]
impl Validatable for CreateOAuthSessionRequestViewModel {
    fn validate(&self) -> Result<(), Vec<crate::errors::FieldError>> {
        if self.bank_name.is_some() != self.bank_country.is_some() {
            return Err(vec![crate::errors::FieldError {
                field: "bank_country".to_string(),
                message: "bank_name and bank_country must be supplied together".to_string(),
            }]);
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateOAuthSessionResponseViewModel {
    pub session_id: String,
    pub auth_url: String,
    pub state: String,
}

/// Relays the provider's OAuth redirect back to the server. Per RFC 6749 the provider
/// returns either `code` (consent granted) or `error` (e.g. access_denied) — never both.
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CompleteOAuthSessionRequestViewModel {
    pub state: String,
    pub code: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(default)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum OAuthSessionStatus {
    Completed,
    Denied,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CompleteOAuthSessionResponseViewModel {
    pub status: OAuthSessionStatus,
    pub connection: ConnectorConnectionViewModel,
}
