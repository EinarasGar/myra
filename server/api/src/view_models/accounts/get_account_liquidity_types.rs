use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAccountLiquidityTypesResponseViewModel {
    pub account_liquidity_types: Vec<IdentifiableAccountLiquidityTypeViewModel>,
}
