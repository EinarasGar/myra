use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::account_type::IdentifiableAccountTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAccountTypesResponseViewModel {
    pub account_types: Vec<IdentifiableAccountTypeViewModel>,
}
