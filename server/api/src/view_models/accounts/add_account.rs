use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::account::{AccountViewModel, IdentifiableAccountViewModel};
use super::base_models::liquidity_type_id::RequiredLiquidityTypeId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAccountRequestViewModel {
    #[serde(flatten)]
    pub account: AccountViewModel,
    pub ownership_share: Decimal,
    pub liquidity_type: RequiredLiquidityTypeId,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddAccountResponseViewModel {
    #[serde(flatten)]
    pub account: IdentifiableAccountViewModel,
    pub ownership_share: Decimal,
    pub liquidity_type: RequiredLiquidityTypeId,
}
