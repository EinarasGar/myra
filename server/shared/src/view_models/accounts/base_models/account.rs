#[cfg(feature = "backend")]
use business::dtos::accounts::{account_dto::AccountDto, full_account_dto::FullAccountDto};
use serde::{Deserialize, Serialize};

use super::account_name::AccountName;
use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
use crate::view_models::accounts::base_models::account_type_id::AccountTypeId;

use super::account_type::IdentifiableAccountTypeViewModel;

pub type AccountViewModel = Account<AccountTypeId>;
pub type ExpandedAccountViewModel = Account<IdentifiableAccountTypeViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct Account<T> {
    pub name: AccountName,

    #[schema(inline = false)]
    pub account_type: T,
}

pub type AccountWithId = IdentifiableAccount<AccountViewModel>;
#[allow(dead_code)]
pub type AccountWithTypeAndId = IdentifiableAccount<ExpandedAccountViewModel>;
pub type IdentifiableAccountViewModel = AccountWithId;
#[allow(dead_code)]
pub type IdentifiableExpandedAccountViewModel = AccountWithTypeAndId;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableAccount<T> {
    pub account_id: RequiredAccountId,

    #[serde(flatten)]
    pub account: T,
}

#[cfg(feature = "backend")]
impl From<FullAccountDto> for AccountWithId {
    fn from(account: FullAccountDto) -> Self {
        Self {
            account_id: RequiredAccountId(account.id),
            account: account.into(),
        }
    }
}

#[cfg(feature = "backend")]
impl From<FullAccountDto> for AccountViewModel {
    fn from(account: FullAccountDto) -> Self {
        Account {
            name: AccountName::from_trusted(account.account_name),
            account_type: AccountTypeId(account.account_type.id),
        }
    }
}

#[cfg(feature = "backend")]
impl From<FullAccountDto> for ExpandedAccountViewModel {
    fn from(account: FullAccountDto) -> Self {
        Account {
            name: AccountName::from_trusted(account.account_name),
            account_type: account.account_type.into(),
        }
    }
}

#[cfg(feature = "backend")]
impl From<AccountDto> for AccountWithId {
    fn from(account: AccountDto) -> Self {
        Self {
            account_id: RequiredAccountId(account.id),
            account: account.into(),
        }
    }
}

#[cfg(feature = "backend")]
impl From<AccountDto> for AccountViewModel {
    fn from(account: AccountDto) -> Self {
        Account {
            name: AccountName::from_trusted(account.account_name),
            account_type: AccountTypeId(account.account_type),
        }
    }
}
