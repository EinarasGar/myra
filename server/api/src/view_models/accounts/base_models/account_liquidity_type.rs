use business::dtos::accounts::account_liquidity_type_dto::AccountLiquidityTypeDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::liquidity_type_id::RequiredLiquidityTypeId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableAccountLiquidityTypeViewModel {
    /// The name of the Account type
    pub name: String,

    /// The id of the Account type
    pub id: RequiredLiquidityTypeId,
}

impl From<AccountLiquidityTypeDto> for IdentifiableAccountLiquidityTypeViewModel {
    fn from(p: AccountLiquidityTypeDto) -> Self {
        Self {
            name: p.name,
            id: RequiredLiquidityTypeId(p.id),
        }
    }
}
