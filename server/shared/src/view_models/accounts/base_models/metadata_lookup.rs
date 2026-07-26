use serde::{Deserialize, Serialize};

use super::{
    account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel,
    account_type::IdentifiableAccountTypeViewModel,
};
use crate::view_models::assets::base_models::asset::IdentifiableAssetViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AccountMetadataLookupTables {
    pub account_types: Vec<IdentifiableAccountTypeViewModel>,
    pub account_liquidity_types: Vec<IdentifiableAccountLiquidityTypeViewModel>,
    pub assets: Vec<IdentifiableAssetViewModel>,
}
