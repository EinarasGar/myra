use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::account::AccountViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAccountViewModel {
    #[serde(flatten)]
    pub account: AccountViewModel,
    pub liquidity_type: i32,
}
