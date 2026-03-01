use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::accounts::base_models::ownership_share::OwnershipShare;

use super::base_models::account::AccountViewModel;
use super::base_models::liquidity_type_id::RequiredLiquidityTypeId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAccountViewModel {
    #[serde(flatten)]
    pub account: AccountViewModel,
    pub ownership_share: OwnershipShare,
    pub liquidity_type: RequiredLiquidityTypeId,
}
