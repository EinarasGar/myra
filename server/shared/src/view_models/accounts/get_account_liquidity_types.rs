use serde::{Deserialize, Serialize};

use super::base_models::account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetAccountLiquidityTypesResponseViewModel {
    pub account_liquidity_types: Vec<IdentifiableAccountLiquidityTypeViewModel>,
}
