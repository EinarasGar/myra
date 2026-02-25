use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    account::ExpandedAccountViewModel,
    account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAccountResponseViewModel {
    #[serde(flatten)]
    pub account: ExpandedAccountViewModel,
    pub ownership_share: Decimal,
    pub liquidity_type: IdentifiableAccountLiquidityTypeViewModel,
}
