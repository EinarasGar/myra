use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel,
    account_type::IdentifiableAccountTypeViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountMetadataLookupTables {
    pub account_types: Vec<IdentifiableAccountTypeViewModel>,
    pub account_liquidity_types: Vec<IdentifiableAccountLiquidityTypeViewModel>,
}
