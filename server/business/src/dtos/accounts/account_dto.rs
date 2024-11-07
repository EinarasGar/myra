use dal::models::account_models::Account;
use uuid::Uuid;

pub struct AccountDto {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_name: String,
    pub account_type: i32,
}

impl From<Account> for AccountDto {
    fn from(account: Account) -> Self {
        Self {
            id: account.id,
            user_id: account.user_id,
            account_name: account.account_name,
            account_type: account.account_type,
        }
    }
}
