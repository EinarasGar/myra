use business::dtos::accounts::account_type_dto::AccountTypeDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::accounts::base_models::account_type_id::AccountTypeId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountTypeViewModel {
    /// The name of the Account type
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableAccountTypeViewModel {
    /// The name of the Account type
    pub name: String,

    /// The id of the Account type
    pub id: AccountTypeId,
}

impl From<AccountTypeDto> for AccountTypeViewModel {
    fn from(p: AccountTypeDto) -> Self {
        Self { name: p.name }
    }
}

impl From<AccountTypeDto> for IdentifiableAccountTypeViewModel {
    fn from(p: AccountTypeDto) -> Self {
        Self {
            name: p.name,
            id: AccountTypeId(p.id),
        }
    }
}
