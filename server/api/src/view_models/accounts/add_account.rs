use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::account::{AccountViewModel, IdentifiableAccountViewModel};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAccountRequestViewModel {
    #[serde(flatten)]
    pub account: AccountViewModel,
    pub liquidity_type: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAccountResponseViewModel {
    #[serde(flatten)]
    pub account: IdentifiableAccountViewModel,
    pub liquidity_type: i32,
}
