#[cfg(feature = "backend")]
use business::dtos::accounts::account_type_dto::AccountTypeDto;
use serde::{Deserialize, Serialize};

use crate::view_models::accounts::base_models::account_type_id::AccountTypeId;

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AccountTypeViewModel {
    /// The name of the Account type
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableAccountTypeViewModel {
    /// The name of the Account type
    pub name: String,

    /// The id of the Account type
    pub id: AccountTypeId,
}

#[cfg(feature = "backend")]
impl From<AccountTypeDto> for AccountTypeViewModel {
    fn from(p: AccountTypeDto) -> Self {
        Self { name: p.name }
    }
}

#[cfg(feature = "backend")]
impl From<AccountTypeDto> for IdentifiableAccountTypeViewModel {
    fn from(p: AccountTypeDto) -> Self {
        Self {
            name: p.name,
            id: AccountTypeId(p.id),
        }
    }
}
