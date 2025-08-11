use business::dtos::accounts::{account_dto::AccountDto, full_account_dto::FullAccountDto};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
use crate::view_models::accounts::base_models::account_type_id::AccountTypeId;

use super::account_type::IdentifiableAccountTypeViewModel;

pub type AccountViewModel = Account<AccountTypeId>;
pub type ExpandedAccountViewModel = Account<IdentifiableAccountTypeViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct Account<T> {
    pub name: String,

    #[schema(inline = false)]
    pub account_type: T,
}

pub type IdentifiableAccountViewModel = IdentifiableAccount<AccountViewModel>;
#[allow(dead_code)]
pub type IdentifiableExpandedAccountViewModel = IdentifiableAccount<ExpandedAccountViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableAccount<T> {
    pub account_id: RequiredAccountId,

    #[serde(flatten)]
    pub account: T,
}

impl From<FullAccountDto> for IdentifiableAccountViewModel {
    fn from(account: FullAccountDto) -> Self {
        Self {
            account_id: RequiredAccountId(account.id),
            account: account.into(),
        }
    }
}

impl From<FullAccountDto> for AccountViewModel {
    fn from(account: FullAccountDto) -> Self {
        Account {
            name: account.account_name,
            account_type: AccountTypeId(account.account_type.id),
        }
    }
}

impl From<FullAccountDto> for ExpandedAccountViewModel {
    fn from(account: FullAccountDto) -> Self {
        Account {
            name: account.account_name,
            account_type: account.account_type.into(),
        }
    }
}

impl From<AccountDto> for IdentifiableAccountViewModel {
    fn from(account: AccountDto) -> Self {
        Self {
            account_id: RequiredAccountId(account.id),
            account: account.into(),
        }
    }
}

impl From<AccountDto> for AccountViewModel {
    fn from(account: AccountDto) -> Self {
        Account {
            name: account.account_name,
            account_type: AccountTypeId(account.account_type),
        }
    }
}
