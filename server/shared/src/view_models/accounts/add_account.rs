use serde::{Deserialize, Serialize};

use crate::view_models::accounts::base_models::ownership_share::OwnershipShare;

use super::base_models::account::{AccountViewModel, IdentifiableAccountViewModel};
use super::base_models::liquidity_type_id::RequiredLiquidityTypeId;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddAccountRequestViewModel {
    #[serde(flatten)]
    pub account: AccountViewModel,
    pub ownership_share: OwnershipShare,
    pub liquidity_type: RequiredLiquidityTypeId,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddAccountResponseViewModel {
    #[serde(flatten)]
    pub account: IdentifiableAccountViewModel,
    pub ownership_share: OwnershipShare,
    pub liquidity_type: RequiredLiquidityTypeId,
}
