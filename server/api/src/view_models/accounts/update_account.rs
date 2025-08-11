use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::account::AccountViewModel;
use super::base_models::liquidity_type_id::RequiredLiquidityTypeId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAccountViewModel {
    #[serde(flatten)]
    pub account: AccountViewModel,
    pub liquidity_type: RequiredLiquidityTypeId,
}
