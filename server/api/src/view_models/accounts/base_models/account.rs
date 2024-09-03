use business::dtos::accounts::{account_dto::AccountDto, full_account_dto::FullAccountDto};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use super::account_type::IdentifiableAccountTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    AccountViewModel = Account<i32>,
    ExpandedAccountViewModel = Account<IdentifiableAccountTypeViewModel>
)]
pub struct Account<T> {
    pub name: String,
    pub account_type: T,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    IdentifiableAccountViewModel = IdentifiableAccount<AccountViewModel>,
    IdentifiableExpandedAccountViewModel = IdentifiableAccount<ExpandedAccountViewModel>
)]
pub struct IdentifiableAccount<T> {
    pub account_id: Uuid,

    #[serde(flatten)]
    pub account: T,
}

impl From<FullAccountDto> for IdentifiableAccountViewModel {
    fn from(account: FullAccountDto) -> Self {
        Self {
            account_id: account.id,
            account: account.into(),
        }
    }
}

impl From<FullAccountDto> for AccountViewModel {
    fn from(account: FullAccountDto) -> Self {
        Account {
            name: account.account_name,
            account_type: account.account_type.id,
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
            account_id: account.id,
            account: account.into(),
        }
    }
}

impl From<AccountDto> for AccountViewModel {
    fn from(account: AccountDto) -> Self {
        Account {
            name: account.account_name,
            account_type: account.account_type,
        }
    }
}
