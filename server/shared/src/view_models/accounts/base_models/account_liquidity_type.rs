#[cfg(feature = "backend")]
use business::dtos::accounts::account_liquidity_type_dto::AccountLiquidityTypeDto;
use serde::{Deserialize, Serialize};

use super::liquidity_type_id::RequiredLiquidityTypeId;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableAccountLiquidityTypeViewModel {
    /// The name of the Account type
    pub name: String,

    /// The id of the Account type
    pub id: RequiredLiquidityTypeId,
}

#[cfg(feature = "backend")]
impl From<AccountLiquidityTypeDto> for IdentifiableAccountLiquidityTypeViewModel {
    fn from(p: AccountLiquidityTypeDto) -> Self {
        Self {
            name: p.name,
            id: RequiredLiquidityTypeId(p.id),
        }
    }
}
