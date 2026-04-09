use serde::{Deserialize, Serialize};

use crate::view_models::accounts::base_models::ownership_share::OwnershipShare;

use super::base_models::{
    account::ExpandedAccountViewModel,
    account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetAccountResponseViewModel {
    #[serde(flatten)]
    pub account: ExpandedAccountViewModel,
    pub ownership_share: OwnershipShare,
    pub liquidity_type: IdentifiableAccountLiquidityTypeViewModel,
}
